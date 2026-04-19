import PaymentSuccess from "@/components/payment/PaymentSuccess";
import { prisma } from "@/lib/db/index";
import { redirect } from "next/navigation";

type PaymentData = {
  payment_id: string;
  order_id: string;
  status: "approved";
  status_detail?: string;
  payment_method_id?: string;
  transaction_amount?: number;
  date_approved?: string;
  card_last_four?: string;
  cardholder_name?: string;
  payment_type_id?: string;
};

type SubscriptionData = {
  preapproval_id: string;
  status: string;
  transaction_amount?: number;
  start_date?: string;
  next_billing_date?: string;
  payer_email?: string;
  recurrence_interval?: string;
  description?: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

// http://localhost:3000/checkout/success?payment_id=xxx
// http://localhost:3000/checkout/success?preapproval_id=xxx
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; preapproval_id?: string }>;
}) {
  const params = await searchParams;
  const paymentId = params.payment_id;
  const preapprovalId = params.preapproval_id;

  // Redirect if no ID provided
  if (!paymentId && !preapprovalId) {
    redirect("https://station24.com.mx/");
  }

  let paymentResult: PaymentData | null = null;
  let subscriptionResult: SubscriptionData | null = null;
  let planName = "Plan Station24";
  let planPrice = 0;
  let planCurrency = "MXN";
  let email: string | undefined;

  // Handle one-time payment
  if (paymentId) {
    const payment = await prisma.payments.findFirst({
      where: { mpPaymentId: paymentId },
    });

    if (!payment) {
      console.error("Payment not found in DB:", paymentId);
      redirect("https://station24.com.mx/");
    }

    // Get prospect for email
    if (payment.prospectId) {
      const prospect = await prisma.prospects.findUnique({
        where: { id: payment.prospectId },
      });
      email = prospect?.email;
    }

    // Convert BigInt to number
    const txAmount = payment.transactionAmount
      ? Number(payment.transactionAmount)
      : undefined;

    paymentResult = {
      payment_id: payment.mpPaymentId || payment.id,
      order_id: payment.mpPreferenceId || payment.id,
      status: "approved",
      status_detail: payment.statusDetail || undefined,
      payment_method_id: payment.paymentMethodId || undefined,
      transaction_amount: txAmount ? txAmount / 100 : undefined,
      date_approved: payment.dateApproved
        ? payment.dateApproved.toISOString()
        : undefined,
      card_last_four: payment.cardLastFour || undefined,
      cardholder_name: payment.cardholderName || undefined,
      payment_type_id: payment.paymentTypeId || undefined,
    };

    planName = payment.description || "Plan Station24";
    planPrice = txAmount ? txAmount / 100 : 0;
    planCurrency = payment.currencyId || "MXN";
  }

  // Handle recurrent subscription (preapproval)
  if (preapprovalId) {
    const subscription = await prisma.subscriptions.findFirst({
      where: { mpPreapprovalId: preapprovalId },
    });

    if (!subscription) {
      console.error("Subscription not found in DB:", preapprovalId);
      redirect("https://station24.com.mx/");
    }

    // Get prospect for email
    if (subscription.prospectId) {
      const prospect = await prisma.prospects.findUnique({
        where: { id: subscription.prospectId },
      });
      email = prospect?.email || subscription.payerEmail || undefined;
    }

    // Convert BigInt to number
    const txAmount = subscription.transactionAmount
      ? Number(subscription.transactionAmount)
      : undefined;

    subscriptionResult = {
      preapproval_id: subscription.mpPreapprovalId || subscription.id,
      status: subscription.status,
      transaction_amount: txAmount ? txAmount / 100 : undefined,
      start_date: subscription.startDate
        ? subscription.startDate.toISOString()
        : undefined,
      next_billing_date: subscription.nextBillingDate
        ? subscription.nextBillingDate.toISOString()
        : undefined,
      payer_email: subscription.payerEmail || undefined,
      recurrence_interval: subscription.recurrenceInterval || undefined,
      description: subscription.description || undefined,
    };

    planName =
      subscription.description || subscription.planDescription || "Plan Station24";
    planPrice = txAmount ? txAmount / 100 : 0;
    planCurrency = subscription.currencyId || "MXN";
  }

  // Build receipt URL based on payment type
  const receiptUrl = paymentId
    ? `/api/receipt/${paymentId}`
    : preapprovalId
      ? `/api/receipt/subscription/${preapprovalId}`
      : undefined;

  return (
    <PaymentSuccess
      payment={paymentResult || undefined}
      subscription={subscriptionResult || undefined}
      plan={{
        id: "",
        name: planName,
        price: planPrice,
        currency: planCurrency,
      }}
      email={email}
      continueUrl="https://station24.com.mx/"
      receiptUrl={receiptUrl}
    />
  );
}