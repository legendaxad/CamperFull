import { env } from "../../config/env";
import { MockPaymentProvider } from "./MockPaymentProvider";
import { PaymentProvider } from "./PaymentProvider";
import { TossPaymentProvider } from "./TossPaymentProvider";

export * from "./PaymentProvider";

const createProvider = (): PaymentProvider => {
  if (env.PAYMENT_PROVIDER === "toss") {
    if (!env.TOSS_SECRET_KEY) throw new Error("TOSS_SECRET_KEY is required when PAYMENT_PROVIDER=toss");
    return new TossPaymentProvider(env.TOSS_SECRET_KEY, env.TOSS_API_BASE_URL);
  }
  return new MockPaymentProvider();
};

export const paymentProvider: PaymentProvider = createProvider();
