import PaymentSuccess from "@/components/payment/PaymentSuccess";
import { db } from "@/lib/db/index";
import { payments, prospects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

type PaymentData = {
  payment_id: string;
  order_id: string;
  status: "approved";
  status_detail?: string;
  payment_method_id?: string;
  transaction_amount?: number;
  date_approved?: string;
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
  console.debug("🚀 ~ SuccessPage ~ paymentId:", paymentId);

  if (!paymentId) {
    redirect("https://station24.com.mx/");
  }

  // Obtener payment de la base de datos
  const paymentData = await db
    .select()
    .from(payments)
    .where(eq(payments.mpPaymentId, paymentId))
    .limit(1);

  const payment = paymentData[0];

  if (!payment) {
    // Si no existe en DB, usamos los datos directamente de MercadoPago
    // En un caso real, deberías guardar el payment en el webhook
    console.error("Payment not found in DB:", paymentId);
    redirect("https://station24.com.mx/");
  }

  // Obtener prospect para el email
  let email: string | undefined;
  if (payment.prospectId) {
    const prospectData = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, payment.prospectId))
      .limit(1);

    email = prospectData[0]?.email;
  }

  // Construir datos del payment para el componente
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
      ? new Date(payment.dateApproved).toISOString()
      : undefined,
  };

  // Determinar nombre del plan desde la descripción
  const planName = payment.description || "Plan Station24";
  const planPrice = payment.transactionAmount
    ? payment.transactionAmount / 100
    : 0;

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
    />
  );
}
