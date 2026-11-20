import { PaymentProviderName } from "../../constants/enums";

/** Provider-neutral view of a payment, as reported by the provider itself. */
export type ProviderPaymentState = "PAID" | "PARTIALLY_CANCELLED" | "CANCELLED" | "FAILED" | "PENDING";

export interface ProviderCancel {
  amount: number;
  transactionKey: string;
  reason: string;
  canceledAt: Date;
}

export interface ProviderPayment {
  transactionId: string;
  orderId: string;
  state: ProviderPaymentState;
  totalAmount: number;
  /** Amount still captured after refunds. */
  balanceAmount: number;
  method?: string;
  approvedAt?: Date;
  receiptUrl?: string;
  cancels: ProviderCancel[];
}

export interface ConfirmRequest {
  transactionId: string;
  orderId: string;
  amount: number;
}

export interface CancelRequest {
  transactionId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}

/** Error reported by the provider (declined card, invalid key...). Safe to show its message to the customer. */
export class PaymentProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

/**
 * Everything the business logic needs from a payment provider. Swapping
 * providers means writing one new class; Payment.service does not change.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** Captures an authorized payment. Only a successful response here counts as "paid". */
  confirm(request: ConfirmRequest): Promise<ProviderPayment>;
  /** Fetches the authoritative state; used to verify webhooks instead of trusting their body. */
  retrieve(transactionId: string): Promise<ProviderPayment>;
  cancel(request: CancelRequest): Promise<ProviderPayment>;
}
