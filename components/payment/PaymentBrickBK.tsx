"use client";

import { processPayment } from "@/app/actions/processPayment";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

// export default function PaymentBrick({ amount }: { amount: number }) {
export default function PaymentBrick({ planId }: { planId: string }) {
  const amount = 1000,
    firstName = "Luis",
    lastName = "HER",
    email = "test_user_123@test.com";

  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!);
  }, []);

  return (
    <Payment
      initialization={{
        amount,
        preferenceId: "<PREFERENCE_ID>",
        payer: {
          firstName,
          lastName,
          email,
        },
      }}
      customization={{
        visual: {
          style: {
            theme: "dark",
            customVariables: {
              formBackgroundColor: "rgb(30, 30, 30)",
              baseColor: "rgb(236, 97, 0)",
              buttonTextColor: "white",
              // textSecondaryColor: "red",
            },
          },
        },
        paymentMethods: {
          // atm: "all",
          creditCard: "all",
          debitCard: "all",
          mercadoPago: "all",
          prepaidCard: "all",
          // ticket: "all",
          maxInstallments: 3,
        },
      }}
      onSubmit={async (formData) => {
        try {
          const result = await processPayment(formData);

          if (result.status === "approved") {
            // 🔥 pago aprobado inmediato
            window.location.href = "/checkout/success";
          }

          return result;
        } catch (error) {
          console.error(error);
          throw error;
        }
      }}
      onReady={() => console.log("Brick listo")}
      onError={(error) => console.error(error)}
    />
  );
}
