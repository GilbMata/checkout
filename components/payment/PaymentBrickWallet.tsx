"use client";

import { createPreference } from "@/app/actions/createPayment";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { useEffect, useState } from "react";

export default function PaymentBrickW({
  planId,
  prospectId,
  email,
  firstName,
  lastName,
  phone,
}: {
  planId: string;
  prospectId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!);
  }, []);

  useEffect(() => {
    const load = async () => {
      const result = await createPreference({
        planId,
        prospectId,
        email,
        firstName,
        lastName,
        phone,
      });
      if (!result?.preferenceId) {
        throw new Error("No se recibió preferenceId");
      }
      setPreferenceId(result.preferenceId);
    };

    load();
  }, [planId, prospectId, email, firstName, lastName, phone]);

  if (!preferenceId) return <p>Cargando pago...</p>;

  return <Wallet initialization={{ preferenceId }} />;
}
