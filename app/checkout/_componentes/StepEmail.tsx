// import { useCheckoutFlow } from "@/hooks/useCheckoutFlow";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useState } from "react";
import ClientForm from "./ClientForm";

export default function StepEmail() {
  // const { setStep, setEmail } = useCheckoutFlow();
  const [email, setLocalEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { setStep, setEmail } = useCheckoutStore();

  //  logger.info({
  //    eventType: "PAYMENT_INITIATED",
  //    traceId,
  //    userId: session?.user?.id, // ajusta según tu estructura de session
  //    payload: { planId, planName: plan.name },
  //  });

  const handleContinue = async () => {
    // setLoading(true);

    // const exists = await checkUser(email);

    // if (!exists) {
    //   await sendOTP(email, planId);
    // }

    // setEmail(email);
    setStep("payment");
    // setLoading(false);
  };

  return (
    <>
      {/* <h2 className="text-xl font-semibold">Ingresa tu correo</h2> */}
      <ClientForm />

      {/* <Button onClick={handleContinue} disabled={loading}>
        Continuar
      </Button> */}
    </>
  );
}
