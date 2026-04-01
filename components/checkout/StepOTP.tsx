"use client";

import { verifyOTPAction } from "@/app/actions/verify-otp";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useOtpTimer } from "@/hooks/useOtpTimer";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface Props {
  planId: string;
}

// export default function StepOTP({ planId }: Props) {
export default function StepOTP() {
  const { setStep, email, planId, phone } = useCheckoutStore();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const { seconds, isActive, reset } = useOtpTimer(60);

  // ⏱ formatear tiempo
  const formatTime = (s: number) => {
    const min = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  const handleVerify = (otp: string) => {
    if (otp.length !== 6) return;
    try {
      setLoading(true);
      startTransition(async () => {
        console.debug("🚀 ~ handleVerify ~ otp:", phone);
        const data = await verifyOTPAction({ phone, otp });
        console.debug("🚀 ~ handleVerify ~ data:", data);
        if (!data.valid) {
          toast.error("Código inválido");
          return;
        }

        toast.success("Acceso correcto 🚀");

        // 👉 aquí cambias step o redirect
        setStep("payment");
        // window.location.href = "/checkout2";
      });
    } catch {
      toast.error("Error validando OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (isActive) return;
    try {
      setLoading(true);

      // const res = await sendOTP(prospectId);

      // if (res) toast.success("Código reenviado");

      reset();
    } catch {
      toast.error("Error al reenviar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-h w-ful max-w-x border-none shadow-none bg-[#1e1e1e] p-5">
      {/* <Card className="w-full max-w-md border-none bg-transparent shadow-none"> */}

      {/* Header */}
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold text-white">
          Verifica tu código
        </CardTitle>
        <CardDescription className="text-sm text-gray-400">
          Para continuar, ingrese el código que enviamos a
        </CardDescription>

        {/* Phone display llamanvo y novedo */}
        <div className="m-auto mt- inline-flex items-center gap-2 bg-linear-to-r from-orange-500/20 via-orange-400/20 to-orange-500/20 px-4 py-2 rounded-full border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-orange-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          </div>
          {/* +523312486283 */}
          <span className="text-lg font-semibold text-white tracking-wide ">
            {phone
              ? ` ${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 9)} ${phone.slice(9, 13)}`
              : "Sin número"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 mt-4 ">
        {/* OTP */}
        <div className="flex justify-center">
          <InputOTP maxLength={6} onComplete={handleVerify}>
            <InputOTPGroup
              className="gap-3 focus:border-orange-500
                    focus:ring-2 focus:ring-orange-500
                    focus:shadow-[0_0_10px_rgba(249,115,22,0.6)"
            >
              {[...Array(6)].map((_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="
                    w-12 h-14 text-xl font-bold
                    bg-zinc-900 border border-zinc-700
                    text-white rounded-xl
                    focus:border-orange-500
                    focus:ring-2 focus:ring-orange-500
                    focus:shadow-[0_0_10px_rgba(249,115,22,0.6)]
                  "
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {/* Button */}
        <Button
          disabled={isPending}
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          {isPending ? "Verificando..." : "Verificar código"}
        </Button>

        {/* Resend */}
        <div className="text-center text-sm">
          {isActive ? (
            <div>
              <p className="text-white">No has recibido el código. </p>
              <p className="text-white">
                Podrás reenviarlo en{" "}
                <span className="text-orange-400">{seconds}s</span>
              </p>
            </div>
          ) : (
            <button
              onClick={handleResend}
              className="text-orange-400 hover:underline"
            >
              Reenviar código
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
