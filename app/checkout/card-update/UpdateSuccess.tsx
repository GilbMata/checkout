"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UpdateSuccessProps {
  onContinue?: () => void;
}

export default function UpdateSuccess({ onContinue }: UpdateSuccessProps) {
  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <Card className="bg-gradient-to-br from-green-900/30 to-[#1e1e1e] border border-green-500/30 rounded-2xl overflow-hidden">
        <CardHeader className="text-center">
          <div className="text-5xl mb-2">✅</div>
          <CardTitle className="text-xl font-semibold text-green-400">
            Tarjeta actualizada
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-400 text-sm">
            Tu método de pago se actualizó correctamente. Tu suscripción
            seguirá activa sin interrupciones.
          </p>
          <Button
            onClick={onContinue || (() => (window.location.href = "/"))}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            Ir al inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}