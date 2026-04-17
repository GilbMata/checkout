import PaymentFailure from "@/components/payment/PaymentFailure";
import { prisma } from "@/lib/db/index";

type PaymentData = {
  success: boolean;
  rejected: boolean;
  status: string;
  status_detail?: string;
  order_id?: string;
  payment_id?: string;
  paymentId?: string;
  external_reference?: string;
  error?: string;
};

export default async function FailurePage({
  searchParams,
}: {
  searchParams: Promise<{
    payment_id?: string;
    status_detail?: string;
    order_id?: string;
    paymentId?: string;
    external_reference?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;

  // Get payment from database
  let email: string | undefined;
  let planName = "Plan Station24";

  if (params.payment_id) {
    const payment = await prisma.payments.findFirst({
      where: { mpPaymentId: params.payment_id },
    });

    if (payment?.prospectId) {
      const prospect = await prisma.prospects.findUnique({
        where: { id: payment.prospectId },
      });
      email = prospect?.email;
    }

    if (payment) {
      planName = payment.description || "Plan Station24";
    }
  }

  // Build payment data from searchParams
  const paymentData: PaymentData = {
    success: false,
    rejected: true,
    status: "rejected",
    status_detail: params.status_detail,
    order_id: params.order_id,
    payment_id: params.payment_id,
    paymentId: params.paymentId,
    external_reference: params.external_reference,
    error: params.error,
  };

  return <PaymentFailure payment={paymentData} email={email} />;
}
