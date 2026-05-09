"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const errorMessages: Record<string, { title: string; description: string }> = {
  expired: {
    title: "Token vencido",
    description: "El enlace de acceso ha expirado. Por favor, solicita un nuevo enlace.",
  },
  invalid: {
    title: "Token no válido",
    description: "El enlace de acceso no es válido o ya fue utilizado.",
  },
  default: {
    title: "Error de acceso",
    description: "Hubo un problema al procesar tu enlace de acceso.",
  },
};

export default function MagicLinkErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  const reason = searchParams.get("reason");
  const error = errorMessages[reason || ""] || errorMessages.default;

  useEffect(() => {
    if (countdown <= 0) {
      router.push("/");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1e1e1e] text-white rounded-2xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold text-red-500">
            {error.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-400">{error.description}</p>
          <p className="text-gray-500 text-sm">
            Serás redirigido en{" "}
            <span className="text-orange-500 font-bold">{countdown}</span>{" "}
            segundos...
          </p>
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}