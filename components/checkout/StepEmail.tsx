"use client";

import ClientForm from "./ClientForm";
// import { useCheckoutFlow } from "@/hooks/useCheckoutFlow";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useState } from "react";

export default function StepEmail() {
  // const { setStep, setEmail } = useCheckoutFlow();
  const [email, setLocalEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { setStep, setEmail, planId } = useCheckoutStore();

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
    <div className="">
      {/* <h2 className="text-xl font-semibold">Ingresa tu correo</h2> */}
      <ClientForm planId={planId} />

      {/* <Button onClick={handleContinue} disabled={loading}>
        Continuar
      </Button> */}
    </div>
  );
}
