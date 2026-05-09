"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PageProps {
  searchParams: Promise<{
    subscription_id?: string;
  }>;
}

export default function MagicLinkSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  const subscriptionId = searchParams.get("subscription_id");

  useEffect(() => {
    if (!subscriptionId) {
      router.push("/");
      return;
    }

    if (countdown <= 0) {
      router.push(`/checkout/card-update?subscription_id=${subscriptionId}`);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router, subscriptionId]);

  if (!subscriptionId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1e1e1e] text-white rounded-2xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold text-green-500">
            Acceso verificado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-400">
            Serás redirigido automáticamente en{" "}
            <span className="text-orange-500 font-bold">{countdown}</span>{" "}
            segundos...
          </p>
          <Button
            onClick={() =>
              router.push(`/checkout/card-update?subscription_id=${subscriptionId}`)
            }
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            Continuar ahora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}