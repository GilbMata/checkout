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
  three_ds_status?: string;
  three_ds_status_detail?: string;
  isSpecialStatus?: boolean;
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
  let threeDsStatus: string | undefined;
  let threeDsStatusDetail: string | undefined;
  let paymentStatusFromDb: string = "rejected";

  if (params.payment_id) {
    const payment = await prisma.orderPayments.findFirst({
      where: { mpPaymentId: params.payment_id },
      include: {
        order: {
          include: {
            prospect: true,
          },
        },
      },
    });

    if (payment?.order?.prospectId) {
      email = payment.order.prospect?.email;
    }

    if (payment) {
      planName = payment.order?.description || "Plan Station24";
      threeDsStatus = payment.threeDsStatus || undefined;
      threeDsStatusDetail = payment.threeDsStatusDetail || undefined;
      paymentStatusFromDb = payment.status;
    }
  }

  // Determine if this is a special status
  const isSpecialStatus = ["charged_back", "authorized", "in_mediation"].includes(paymentStatusFromDb);
  
  // Build payment data from searchParams
  const paymentData: PaymentData = {
    success: false,
    rejected: paymentStatusFromDb === "rejected",
    status: paymentStatusFromDb,
    status_detail: params.status_detail,
    order_id: params.order_id,
    payment_id: params.payment_id,
    paymentId: params.paymentId,
    external_reference: params.external_reference,
    error: params.error,
    three_ds_status: threeDsStatus,
    three_ds_status_detail: threeDsStatusDetail,
    isSpecialStatus: isSpecialStatus,
  };

  return <PaymentFailure payment={paymentData} email={email} />;
}
