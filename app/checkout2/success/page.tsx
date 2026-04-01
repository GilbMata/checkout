"use client";

import { useCheckoutStore } from "@/store/useCheckoutStore";
import Link from "next/link";

export default function SuccessPage() {
  const { email, planId } = useCheckoutStore();

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🎉</div>

        <h1 className="text-3xl font-bold text-green-500">¡Pago Exitoso!</h1>

        <div className="space-y-2 text-gray-300">
          <p>Tu pago ha sido procesado correctamente.</p>
          <p className="text-sm">
            Hemos enviado un correo de confirmación a <strong>{email}</strong>
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-400">Detalles del pago:</p>
          <p className="font-medium">Plan: {planId}</p>
          <p className="text-sm text-green-400">Estado: Aprobado</p>
        </div>

        <div className="pt-4 space-y-3">
          <Link
            href="/"
            className="block w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors"
          >
            Ir al inicio
          </Link>

          <Link
            href={`/checkout2?planId=${planId}`}
            className="block w-full py-3 border border-gray-600 hover:border-gray-500 rounded-lg font-medium transition-colors"
          >
            Nuevo registro
          </Link>
        </div>
      </div>
    </div>
  );
}
