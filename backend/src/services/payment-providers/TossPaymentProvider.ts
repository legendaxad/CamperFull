import { PaymentProviderName } from "../../constants/enums";
import {
  CancelRequest,
  ConfirmRequest,
  PaymentProvider,
  PaymentProviderError,
  ProviderPayment,
  ProviderPaymentState,
} from "./PaymentProvider";

interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  balanceAmount: number;
  method?: string;
  approvedAt?: string;
  receipt?: { url?: string };
  cancels?: { cancelAmount: number; transactionKey: string; cancelReason: string; canceledAt: string }[] | null;
}

interface TossErrorResponse {
  code?: string;
  message?: string;
}

const STATE_BY_TOSS_STATUS: Record<string, ProviderPaymentState> = {
  DONE: "PAID",
  PARTIAL_CANCELED: "PARTIALLY_CANCELLED",
  CANCELED: "CANCELLED",
  ABORTED: "FAILED",
  EXPIRED: "FAILED",
};

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Toss Payments (Korea) integration via its REST API.
 * Flow: the frontend opens the Toss payment widget with our orderId and
 * amount; on success Toss redirects back with a paymentKey, and the server
 * confirms that payment here using the secret key. Card details never touch
 * our servers.
 * Docs: https://docs.tosspayments.com/reference
 */
export class TossPaymentProvider implements PaymentProvider {
  public readonly name = PaymentProviderName.TOSS;

  constructor(
    private readonly secretKey: string,
    private readonly baseUrl: string,
  ) {}

  public confirm(request: ConfirmRequest): Promise<ProviderPayment> {
    return this.call("POST", "/v1/payments/confirm", {
      body: { paymentKey: request.transactionId, orderId: request.orderId, amount: request.amount },
      // Retrying a confirm with the same key can never capture twice.
      idempotencyKey: `confirm-${request.orderId}`,
    });
  }

  public retrieve(transactionId: string): Promise<ProviderPayment> {
    return this.call("GET", `/v1/payments/${encodeURIComponent(transactionId)}`);
  }

  public cancel(request: CancelRequest): Promise<ProviderPayment> {
    return this.call("POST", `/v1/payments/${encodeURIComponent(request.transactionId)}/cancel`, {
      body: { cancelReason: request.reason, cancelAmount: request.amount },
      idempotencyKey: request.idempotencyKey,
    });
  }

  private async call(
    method: "GET" | "POST",
    path: string,
    options: { body?: Record<string, unknown>; idempotencyKey?: string } = {},
  ): Promise<ProviderPayment> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new PaymentProviderError("NETWORK_ERROR", `Payment provider is unreachable: ${(error as Error).message}`);
    });

    const payload = (await response.json().catch(() => ({}))) as TossPaymentResponse & TossErrorResponse;
    if (!response.ok) {
      throw new PaymentProviderError(payload.code ?? `HTTP_${response.status}`, payload.message ?? "Payment provider error");
    }
    return this.toProviderPayment(payload);
  }

  private toProviderPayment(payment: TossPaymentResponse): ProviderPayment {
    return {
      transactionId: payment.paymentKey,
      orderId: payment.orderId,
      state: STATE_BY_TOSS_STATUS[payment.status] ?? "PENDING",
      totalAmount: payment.totalAmount,
      balanceAmount: payment.balanceAmount,
      method: payment.method,
      approvedAt: payment.approvedAt ? new Date(payment.approvedAt) : undefined,
      receiptUrl: payment.receipt?.url,
      cancels: (payment.cancels ?? []).map((cancel) => ({
        amount: cancel.cancelAmount,
        transactionKey: cancel.transactionKey,
        reason: cancel.cancelReason,
        canceledAt: new Date(cancel.canceledAt),
      })),
    };
  }
}
