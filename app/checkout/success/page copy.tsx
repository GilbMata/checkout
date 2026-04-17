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
  // Datos de la tarjeta
  card_last_four?: string;
  cardholder_name?: string;
  payment_type_id?: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

// http://localhost:3000/checkout/success?payment_id=PAY01KNMR4AM2AXYZ21HKWXJCACSQ
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string }>;
}) {
  const params = await searchParams;
  const paymentId = params.payment_id;

  if (!paymentId) {
    redirect("https://station24.com.mx/");
  }

  // Obtener payment de la base de datos usando Prisma
  const payment = await prisma.payments.findFirst({
    where: { mpPaymentId: paymentId },
  });

  if (!payment) {
    // Si no existe en DB, usamos los datos directamente de MercadoPago
    // En un caso real, deberías guardar el payment en el webhook
    console.error("Payment not found in DB:", paymentId);
    redirect("https://station24.com.mx/");
  }

  // Obtener prospect para el email
  let email: string | undefined;
  if (payment.prospectId) {
    const prospect = await prisma.prospects.findUnique({
      where: { id: payment.prospectId },
    });
    email = prospect?.email;
  }

  // Construir datos del payment para el componente
  // @ts-ignore - campos nuevos en Prisma
  const paymentResult: PaymentData = {
    payment_id: payment.mpPaymentId || payment.id,
    order_id: payment.mpPreferenceId || payment.id,
    status: payment.status as "approved",
    status_detail: payment.statusDetail || undefined,
    payment_method_id: payment.paymentMethodId || undefined,
    transaction_amount: payment.transactionAmount
      ? payment.transactionAmount / 100
      : undefined,
    date_approved: payment.dateApproved
      ? payment.dateApproved.toISOString()
      : undefined,
    // Datos de la tarjeta (campos nuevos en Prisma)
    card_last_four: (payment as any).cardLastFour || undefined,
    cardholder_name: (payment as any).cardholderName || undefined,
    payment_type_id: (payment as any).paymentTypeId || undefined,
  };

  // Determinar nombre del plan desde la descripción
  const planName = payment.description || "Plan Station24";
  const planPrice = payment.transactionAmount
    ? payment.transactionAmount / 100
    : 0;

  // URL para descargar el receipt
  const receiptUrl = `/api/receipt/${paymentId}`;

  return (
    <PaymentSuccess
      payment={paymentResult}
      plan={{
        id: payment.planId || "",
        name: planName,
        price: planPrice,
        currency: payment.currencyId || "MXN",
      }}
      email={email}
      continueUrl="https://station24.com.mx/"
      receiptUrl={receiptUrl}
    />
  );
}
