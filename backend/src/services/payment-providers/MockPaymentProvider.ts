import crypto from "node:crypto";
import { PaymentProviderName } from "../../constants/enums";
import { CancelRequest, ConfirmRequest, PaymentProvider, PaymentProviderError, ProviderPayment } from "./PaymentProvider";

/**
 * Local stand-in for a real provider, for development and automated tests.
 * Rejected by env validation in production. A transactionId starting with
 * "fail_" simulates a declined payment.
 */
export class MockPaymentProvider implements PaymentProvider {
  public readonly name = PaymentProviderName.MOCK;
  private readonly payments = new Map<string, ProviderPayment>();

  public async confirm(request: ConfirmRequest): Promise<ProviderPayment> {
    if (request.transactionId.startsWith("fail_")) {
      throw new PaymentProviderError("REJECT_CARD_PAYMENT", "The card was declined");
    }
    const existing = this.payments.get(request.transactionId);
    if (existing) return existing;

    const payment: ProviderPayment = {
      transactionId: request.transactionId,
      orderId: request.orderId,
      state: "PAID",
      totalAmount: request.amount,
      balanceAmount: request.amount,
      method: "CARD",
      approvedAt: new Date(),
      receiptUrl: undefined,
      cancels: [],
    };
    this.payments.set(request.transactionId, payment);
    return payment;
  }

  public async retrieve(transactionId: string): Promise<ProviderPayment> {
    const payment = this.payments.get(transactionId);
    if (!payment) throw new PaymentProviderError("NOT_FOUND_PAYMENT", "Payment not found");
    return payment;
  }

  public async cancel(request: CancelRequest): Promise<ProviderPayment> {
    const payment = await this.retrieve(request.transactionId);
    if (request.amount > payment.balanceAmount) {
      throw new PaymentProviderError("NOT_CANCELABLE_AMOUNT", "Cancel amount exceeds the remaining balance");
    }
    payment.balanceAmount -= request.amount;
    payment.state = payment.balanceAmount === 0 ? "CANCELLED" : "PARTIALLY_CANCELLED";
    payment.cancels.push({
      amount: request.amount,
      transactionKey: crypto.randomUUID(),
      reason: request.reason,
      canceledAt: new Date(),
    });
    return payment;
  }

  /** Test helper: simulates a state change that happened on the provider side. */
  public setState(transactionId: string, state: ProviderPayment["state"]): void {
    const payment = this.payments.get(transactionId);
    if (payment) payment.state = state;
  }
}
