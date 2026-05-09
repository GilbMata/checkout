"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";

interface WelcomeToastProps {
  userName: string;
}

export default function WelcomeToast({ userName }: WelcomeToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (userName) {
      toast.success(`¡Bienvenido, ${userName}!`, {
        description: "Actualiza los datos de tu tarjeta de pago",
        duration: 5000,
      });
    }
  }, [userName]);

  return null;
}