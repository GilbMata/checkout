import { useCheckoutStore } from "@/store/useCheckoutStore";
import { StatusScreen } from "@mercadopago/sdk-react";
import { useState } from "react";
import CardPaymentBrick from "./CardPaymentBrick";
interface StepPaymentProps {
  planId: string;
}

// export default function StepPayment() {
//   const { setStep, setEmail, planId } = useCheckoutStore();
export default function StepPayment({ planId }: StepPaymentProps) {
  const { setStep, setEmail, phone } = useCheckoutStore();
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [paymentSuccess, setpaymentSuccess] = useState<any>(null);

  const handlePaymentSuccess = (result: any) => {
    setPaymentResult({
      success: true,
      message: `¡Pago aprobado! ID: ${result.payment_id}`,
    });
  };

  const handlePaymentError = (error: any) => {
    setPaymentResult({
      success: false,
      message: `Error: ${JSON.stringify(error)}`,
    });
  };
  const data = {
    title: "Producto de ejemplo",
    price: 1000,
    quantity: 1,
    phone: "3312486283",
    email: "test@test.com",
    description: "Descripción del producto",
  };

  return (
    <div className="space-y-4 max-w-lg min-w-md mx-auto">
      <main className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-8 text-center">
          Pagar con tarjeta
        </h1>

        <CardPaymentBrick
          amount={1000}
          description="Producto de ejemplo"
          phone="3312486283"
          onSuccess={(result) => {
            setpaymentSuccess(result.success);
            return (
              <StatusScreen initialization={{ paymentId: result.payment_id }} />
            );
            setPaymentResult({
              success: true,
              message: `✅ Pago aprobado! ID: ${result.payment_id}`,
            });
          }}
          onError={(error) => {
            setPaymentResult({
              success: false,
              message: `❌ Error: ${JSON.stringify(error)}`,
            });
          }}
        />

        {paymentResult && (
          <div
            className={`mt-4 p-4 rounded text-center ${
              paymentResult.success
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {paymentResult.message}
          </div>
        )}
      </main>
      <h2 className="text-2xl text-orange-500 font-bold text-center">
        Completa tu pago
      </h2>

      {/* <PaymentBrickW planId={planId} /> */}
      {/* <PaymentBrick planId={planId} /> */}
      {/* <PaymentBrick planId={planId} /> */}
    </div>
  );
}
