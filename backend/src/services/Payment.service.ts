import { FilterQuery, Types } from "mongoose";
import { z } from "zod";
import { runInTransaction } from "../database/connection";
import { BookingStatus, NotificationType, PaymentStatus } from "../constants/enums";
import { HttpCode } from "../constants/http";
import { Message } from "../constants/messages";
import { Booking, Payment } from "../interfaces/booking.interface";
import { BookingModel, CamperModel, PaymentModel } from "../models";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { buildPaginationMeta, getSkip, PaginatedResult } from "../utils/pagination";
import { containsRegex, randomCode } from "../utils/strings";
import {
  adminPaymentListQuerySchema,
  paymentConfirmSchema,
  paymentListQuerySchema,
  refundSchema,
} from "../validators/payment.validator";
import { availabilityService } from "./Availability.service";
import { bookingService } from "./Booking.service";
import { notificationService } from "./Notification.service";
import { paymentProvider, PaymentProviderError, ProviderPayment } from "./payment-providers";

type ConfirmInput = z.infer<typeof paymentConfirmSchema>;
type RefundInput = z.infer<typeof refundSchema>;
type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
type AdminPaymentListQuery = z.infer<typeof adminPaymentListQuerySchema>;

/** Thrown when another request already recorded this capture; it must not trigger a refund. */
class PaymentAlreadyProcessedError extends AppError {
  constructor() {
    super(HttpCode.CONFLICT, "Payment was already processed");
  }
}

/** Extra time the dates stay reserved while the provider captures the payment. */
const CAPTURE_HOLD_MS = 10 * 60 * 1000;

export interface CheckoutSession {
  paymentId: string;
  provider: string;
  orderId: string;
  orderName: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
}

/*
 * PAYMENT FLOW
 *  1. checkout  -> creates a PENDING Payment with our own orderId and the
 *                  amount taken from the booking (never from the client).
 *  2. client pays in the provider's widget and gets a transactionId.
 *  3. confirm   -> verifies amount, re-reserves the dates, asks the provider
 *                  to capture, and only on provider success marks PAID and
 *                  confirms the booking.
 *  Webhooks are verified by re-fetching the payment from the provider.
 *
 * This service also owns the money-related booking transitions (confirm on
 * payment, refund on cancel), which keeps the dependency one-way:
 * Payment.service -> Booking.service.
 */
class PaymentService {
  private readonly paymentModel = PaymentModel;

  public async checkout(customerId: Types.ObjectId, bookingId: string, customer: { name: string; email: string }): Promise<CheckoutSession> {
    const booking = await bookingService.getForCustomer(bookingId, customerId);
    if (booking.status !== BookingStatus.PENDING) throw AppError.badRequest("Only bookings awaiting payment can be paid");
    if (!booking.holdExpiresAt || booking.holdExpiresAt.getTime() <= Date.now()) {
      throw AppError.badRequest("The payment window for this booking has expired. Please book again.");
    }
    if (await this.paymentModel.exists({ booking: booking._id, status: PaymentStatus.PAID })) {
      throw AppError.conflict("This booking has already been paid");
    }

    // Reuse an open attempt so repeated clicks do not create duplicate orders.
    const existing = await this.paymentModel
      .findOne({ booking: booking._id, status: PaymentStatus.PENDING, amount: booking.price.total, provider: paymentProvider.name })
      .lean<Payment>()
      .exec();
    const payment =
      existing ??
      (
        await this.paymentModel.create({
          booking: booking._id,
          customer: customerId,
          provider: paymentProvider.name,
          orderId: `${booking.bookingNumber}-${randomCode(6)}`,
          amount: booking.price.total,
          currency: booking.price.currency,
        })
      ).toObject();

    const camper = await CamperModel.findById(booking.camper).select("name").lean().exec();
    return {
      paymentId: payment._id.toString(),
      provider: payment.provider,
      orderId: payment.orderId,
      orderName: `${camper?.name ?? "Camper rental"} - ${booking.nights} night(s)`,
      amount: payment.amount,
      currency: payment.currency,
      customerName: customer.name,
      customerEmail: customer.email,
    };
  }

  public async confirm(customerId: Types.ObjectId, input: ConfirmInput): Promise<Payment> {
    const payment = await this.paymentModel.findOne({ orderId: input.orderId, customer: customerId }).lean<Payment>().exec();
    if (!payment) throw AppError.notFound(Message.PAYMENT_NOT_FOUND);

    // Idempotent: the redirect page may call confirm more than once.
    if (payment.status === PaymentStatus.PAID && payment.transactionId === input.transactionId) return payment;
    if (payment.status !== PaymentStatus.PENDING) throw AppError.badRequest(`This payment is already ${payment.status.toLowerCase()}`);

    // The amount comes back through the browser, so it must match what we stored.
    if (input.amount !== payment.amount) {
      await this.markFailed(payment._id, "Amount mismatch between checkout and confirmation");
      throw AppError.badRequest("Payment amount does not match the booking total");
    }

    await this.reserveDatesForCapture(payment.booking);

    let providerPayment: ProviderPayment;
    try {
      providerPayment = await paymentProvider.confirm({ transactionId: input.transactionId, orderId: payment.orderId, amount: payment.amount });
    } catch (error) {
      const reason = error instanceof PaymentProviderError ? error.message : "Payment provider error";
      await this.markFailed(payment._id, reason);
      await this.notifyPaymentFailed(payment, reason);
      throw new AppError(HttpCode.BAD_REQUEST, `Payment failed: ${reason}`);
    }

    return this.applyCapturedPayment(payment, providerPayment);
  }

  /**
   * Webhook handler. The request body is never trusted: it is only used to
   * find the payment, whose real state is then fetched from the provider.
   */
  public async handleWebhook(transactionId: string, orderId: string): Promise<void> {
    const payment = await this.paymentModel.findOne({ orderId }).lean<Payment>().exec();
    if (!payment) {
      logger.warn({ orderId }, "Webhook for unknown payment ignored");
      return;
    }

    let providerPayment: ProviderPayment;
    try {
      providerPayment = await paymentProvider.retrieve(transactionId);
    } catch (error) {
      if (error instanceof PaymentProviderError && error.code === "NOT_FOUND_PAYMENT") {
        logger.warn({ orderId, transactionId }, "Webhook for a payment unknown to the provider ignored");
        return;
      }
      // Non-2xx makes the provider retry the webhook later.
      throw new AppError(HttpCode.BAD_GATEWAY, "Could not verify payment with the provider");
    }
    if (providerPayment.orderId !== payment.orderId) {
      logger.warn({ orderId, transactionId }, "Webhook transaction does not belong to this order");
      return;
    }

    if (providerPayment.state === "PAID" && payment.status === PaymentStatus.PENDING) {
      await this.applyCapturedPayment(payment, providerPayment);
    } else if (providerPayment.state === "FAILED" && payment.status === PaymentStatus.PENDING) {
      await this.markFailed(payment._id, "Payment was aborted or expired at the provider");
    } else if (providerPayment.state === "CANCELLED" || providerPayment.state === "PARTIALLY_CANCELLED") {
      await this.syncRefundsFromProvider(payment, providerPayment);
    }
  }

  /** Refunds part or all of a payment through the provider. Used by admins and by cancellations. */
  public async refund(paymentId: string | Types.ObjectId, input: RefundInput, actorId?: Types.ObjectId): Promise<Payment> {
    const payment = await this.paymentModel.findById(paymentId).lean<Payment>().exec();
    if (!payment) throw AppError.notFound(Message.PAYMENT_NOT_FOUND);
    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw AppError.badRequest("Only paid payments can be refunded");
    }

    const refundable = payment.amount - payment.refundedAmount;
    const amount = input.amount ?? refundable;
    if (amount < 1 || amount > refundable) {
      throw AppError.badRequest(`Refund amount must be between 1 and ${refundable}`, [{ field: "amount", message: "Out of range" }]);
    }

    let providerPayment: ProviderPayment;
    try {
      providerPayment = await paymentProvider.cancel({
        transactionId: payment.transactionId as string,
        amount,
        reason: input.reason,
        // Unique per refund attempt; a retried HTTP call will not refund twice.
        idempotencyKey: `refund-${payment._id.toString()}-${payment.refunds.length + 1}`,
      });
    } catch (error) {
      const reason = error instanceof PaymentProviderError ? error.message : "Payment provider error";
      throw new AppError(HttpCode.BAD_GATEWAY, `Refund failed: ${reason}`);
    }

    const latestCancel = providerPayment.cancels.at(-1);
    const refundedAmount = payment.refundedAmount + amount;
    const status = refundedAmount >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

    const updated = await this.paymentModel
      .findByIdAndUpdate(
        payment._id,
        {
          $set: { status, refundedAmount },
          $push: {
            refunds: { amount, reason: input.reason, transactionKey: latestCancel?.transactionKey, processedBy: actorId, refundedAt: new Date() },
          },
        },
        { new: true },
      )
      .lean<Payment>()
      .exec();
    await bookingService.setPaymentStatus(payment.booking, status);

    await notificationService.notifyMemberSafely(payment.customer, {
      type: NotificationType.PAYMENT_REFUNDED,
      title: "Refund processed",
      message: `${amount.toLocaleString("en-US")} ${payment.currency} has been refunded to your original payment method.`,
      data: { paymentId: payment._id.toString(), bookingId: payment.booking.toString() },
    });
    return updated as Payment;
  }

  /** Customer cancellation: policy check, refund if paid, then cancel. Refund first, so a failed refund changes nothing. */
  public async cancelBookingAsCustomer(customerId: Types.ObjectId, bookingId: string, reason?: string): Promise<Booking> {
    const booking = await bookingService.getForCustomer(bookingId, customerId);
    await bookingService.assertCustomerCanCancel(booking);
    await this.refundBookingIfPaid(booking._id, reason ?? "Cancelled by customer", customerId);
    await bookingService.changeStatus(booking._id, { to: BookingStatus.CANCELLED, actorId: customerId, reason: reason ?? "Cancelled by customer" });
    return bookingService.getForCustomer(bookingId, customerId);
  }

  /** Admin status change. Cancelling with `refund: true` refunds the remaining paid amount first. */
  public async adminUpdateBookingStatus(
    bookingId: string,
    input: { status: BookingStatus; reason?: string; refund: boolean },
    adminId: Types.ObjectId,
  ): Promise<Booking> {
    if (input.status === BookingStatus.CANCELLED && input.refund) {
      const booking = await bookingService.findById(bookingId);
      if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING) {
        await this.refundBookingIfPaid(booking._id, input.reason ?? "Cancelled by FullCamper", adminId);
      }
    }
    await bookingService.changeStatus(bookingId, { to: input.status, actorId: adminId, reason: input.reason });
    return bookingService.getForAdmin(bookingId);
  }

  public async listForCustomer(customerId: Types.ObjectId, query: PaymentListQuery): Promise<PaginatedResult<Payment>> {
    const filter = { customer: customerId };
    const [items, total] = await Promise.all([
      this.paymentModel.find(filter).sort({ createdAt: -1 }).skip(getSkip(query)).limit(query.limit).populate("booking", "bookingNumber startDate endDate status").lean<Payment[]>().exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async getForCustomer(customerId: Types.ObjectId, paymentId: string): Promise<Payment> {
    const payment = await this.paymentModel.findOne({ _id: paymentId, customer: customerId }).populate("booking", "bookingNumber startDate endDate status").lean<Payment>().exec();
    if (!payment) throw AppError.notFound(Message.PAYMENT_NOT_FOUND);
    return payment;
  }

  public async listForAdmin(query: AdminPaymentListQuery): Promise<PaginatedResult<Payment>> {
    const filter: FilterQuery<Payment> = {};
    if (query.status?.length) filter.status = { $in: query.status };
    if (query.bookingId) filter.booking = query.bookingId;
    if (query.customerId) filter.customer = query.customerId;
    if (query.from || query.to) {
      filter.createdAt = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lt: query.to } : {}) };
    }
    if (query.search) {
      const regex = containsRegex(query.search);
      filter.$or = [{ orderId: regex }, { transactionId: regex }];
    }
    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .populate("booking", "bookingNumber startDate endDate status")
        .populate("customer", "firstName lastName email")
        .lean<Payment[]>()
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async getForAdmin(paymentId: string): Promise<Payment> {
    const payment = await this.paymentModel
      .findById(paymentId)
      .populate("booking", "bookingNumber startDate endDate status price")
      .populate("customer", "firstName lastName email phone")
      .populate("refunds.processedBy", "firstName lastName")
      .lean<Payment>()
      .exec();
    if (!payment) throw AppError.notFound(Message.PAYMENT_NOT_FOUND);
    return payment;
  }

  /* ---------------- internals ---------------- */

  /**
   * Before capturing money, make sure the booking can still be confirmed and
   * extend its hold so nobody takes the dates while the provider responds.
   */
  private async reserveDatesForCapture(bookingId: Types.ObjectId): Promise<void> {
    await runInTransaction(async (session) => {
      const booking = await bookingService.findById(bookingId, session);
      if (booking.status !== BookingStatus.PENDING) {
        throw AppError.badRequest("This booking can no longer be paid. Please create a new booking.");
      }
      await CamperModel.updateOne({ _id: booking.camper }, { $inc: { bookingLockVersion: 1 } }, { session }).exec();
      const conflicts = await availabilityService.findConflicts(booking.camper, booking.startDate, booking.endDate, {
        session,
        excludeBookingId: booking._id,
      });
      if (conflicts.length > 0) throw AppError.conflict(Message.DATES_UNAVAILABLE);
      await BookingModel.updateOne({ _id: booking._id }, { $set: { holdExpiresAt: new Date(Date.now() + CAPTURE_HOLD_MS) } }, { session }).exec();
    });
  }

  /** Records a provider-confirmed capture and confirms the booking in one transaction. */
  private async applyCapturedPayment(payment: Payment, providerPayment: ProviderPayment): Promise<Payment> {
    if (providerPayment.state !== "PAID" || providerPayment.totalAmount !== payment.amount) {
      await this.markFailed(payment._id, "Provider did not confirm the expected amount");
      throw AppError.badRequest("Payment could not be verified");
    }

    try {
      const updated = await runInTransaction(async (session) => {
        const paid = await this.paymentModel
          .findOneAndUpdate(
            { _id: payment._id, status: PaymentStatus.PENDING },
            {
              $set: {
                status: PaymentStatus.PAID,
                transactionId: providerPayment.transactionId,
                method: providerPayment.method,
                receiptUrl: providerPayment.receiptUrl,
                paidAt: providerPayment.approvedAt ?? new Date(),
              },
              $unset: { failureReason: 1 },
            },
            { new: true, session },
          )
          .lean<Payment>()
          .exec();
        if (!paid) throw new PaymentAlreadyProcessedError();

        const booking = await bookingService.findById(payment.booking, session);
        if (booking.status === BookingStatus.PENDING) {
          await bookingService.changeStatus(booking._id, { to: BookingStatus.CONFIRMED, reason: "Payment received" }, session);
        } else if (booking.status !== BookingStatus.CONFIRMED) {
          throw AppError.conflict("Booking is no longer awaiting payment");
        }
        await bookingService.setPaymentStatus(booking._id, PaymentStatus.PAID, session);
        return paid;
      });

      const booking = await bookingService.findById(payment.booking);
      await Promise.all([
        bookingService.notifyStatusChange(booking),
        notificationService.notifyMemberSafely(payment.customer, {
          type: NotificationType.PAYMENT_SUCCEEDED,
          title: "Payment received",
          message: `We received ${payment.amount.toLocaleString("en-US")} ${payment.currency} for booking ${booking.bookingNumber}.`,
          data: { paymentId: payment._id.toString(), bookingId: booking._id.toString() },
        }),
        notificationService.notifyAdmins({
          type: NotificationType.PAYMENT_SUCCEEDED,
          title: "Booking paid",
          message: `Booking ${booking.bookingNumber} was paid (${payment.amount.toLocaleString("en-US")} ${payment.currency}).`,
          data: { paymentId: payment._id.toString(), bookingId: booking._id.toString() },
        }),
      ]);
      return updated;
    } catch (error) {
      if (error instanceof PaymentAlreadyProcessedError) {
        // A concurrent confirm (e.g. the redirect page firing twice) already applied it.
        const current = await this.paymentModel.findById(payment._id).lean<Payment>().exec();
        if (current?.status === PaymentStatus.PAID && current.transactionId === providerPayment.transactionId) return current;
        throw error;
      }
      // Money was captured but the booking cannot be confirmed: give it back automatically.
      logger.error({ err: error, paymentId: payment._id.toString() }, "Captured payment could not be applied; refunding");
      await this.compensateCapturedPayment(payment, providerPayment);
      throw AppError.conflict("Your booking could not be confirmed, so the payment has been refunded.");
    }
  }

  private async compensateCapturedPayment(payment: Payment, providerPayment: ProviderPayment): Promise<void> {
    try {
      await paymentProvider.cancel({
        transactionId: providerPayment.transactionId,
        amount: providerPayment.balanceAmount,
        reason: "Booking could not be confirmed",
        idempotencyKey: `compensate-${payment._id.toString()}`,
      });
      await this.paymentModel
        .updateOne(
          { _id: payment._id },
          {
            $set: {
              status: PaymentStatus.REFUNDED,
              transactionId: providerPayment.transactionId,
              refundedAmount: payment.amount,
              failureReason: "Booking could not be confirmed; payment refunded automatically",
            },
            $push: { refunds: { amount: payment.amount, reason: "Booking could not be confirmed", refundedAt: new Date() } },
          },
        )
        .exec();
    } catch (refundError) {
      logger.fatal({ err: refundError, paymentId: payment._id.toString() }, "Automatic refund failed; manual action required");
      await notificationService.notifyAdmins({
        type: NotificationType.PAYMENT_FAILED,
        title: "Manual refund required",
        message: `Payment ${payment.orderId} was captured but its booking could not be confirmed, and the automatic refund failed.`,
        data: { paymentId: payment._id.toString() },
      });
    }
  }

  private async refundBookingIfPaid(bookingId: Types.ObjectId, reason: string, actorId: Types.ObjectId): Promise<void> {
    const paid = await this.paymentModel
      .findOne({ booking: bookingId, status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } })
      .lean<Payment>()
      .exec();
    if (paid) await this.refund(paid._id, { reason }, actorId);
  }

  /** Mirrors refunds that were made directly in the provider's dashboard. */
  private async syncRefundsFromProvider(payment: Payment, providerPayment: ProviderPayment): Promise<void> {
    const refundedAmount = payment.amount - providerPayment.balanceAmount;
    if (refundedAmount <= payment.refundedAmount) return;
    const known = new Set(payment.refunds.map((refund) => refund.transactionKey));
    const newRefunds = providerPayment.cancels
      .filter((cancel) => !known.has(cancel.transactionKey))
      .map((cancel) => ({ amount: cancel.amount, reason: cancel.reason, transactionKey: cancel.transactionKey, refundedAt: cancel.canceledAt }));
    const status = providerPayment.balanceAmount === 0 ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
    await this.paymentModel.updateOne({ _id: payment._id }, { $set: { status, refundedAmount }, $push: { refunds: { $each: newRefunds } } }).exec();
    await bookingService.setPaymentStatus(payment.booking, status);
  }

  private async markFailed(paymentId: Types.ObjectId, reason: string): Promise<void> {
    await this.paymentModel
      .updateOne({ _id: paymentId, status: PaymentStatus.PENDING }, { $set: { status: PaymentStatus.FAILED, failureReason: reason } })
      .exec();
  }

  private async notifyPaymentFailed(payment: Payment, reason: string): Promise<void> {
    await notificationService.notifyMemberSafely(payment.customer, {
      type: NotificationType.PAYMENT_FAILED,
      title: "Payment failed",
      message: `Your payment could not be completed: ${reason}. You can try again before the booking hold expires.`,
      data: { paymentId: payment._id.toString(), bookingId: payment.booking.toString() },
    });
  }
}

export const paymentService = new PaymentService();
