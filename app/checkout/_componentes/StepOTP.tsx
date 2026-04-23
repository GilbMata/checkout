"use client";

import { sendOTP } from "@/app/actions/send-otp";
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
  const { setStep, prospect } = useCheckoutStore();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const { seconds, isActive, reset } = useOtpTimer(60);
  // setStep("payment");

  const phone = prospect?.phone ?? "";
  const customerId = prospect?.id;

  // formatear tiempo
  const formatTime = (s: number) => {
    const min = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  const handleVerify = async (otp: string) => {
    if (loading) return;
    if (!customerId) {
      toast.error("Error: no se pudo obtener el ID");
      return;
    }
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const data = await verifyOTPAction({ phone, otp });
      console.log("🚀 ~ handleVerify ~ data:", data);
      if (!data.valid) {
        toast.error(data.error);
        return;
      }
      toast.success("Acceso correcto");
      setStep("payment");
    } catch (error: any) {
      console.error("OTP error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (isActive) return;
    if (loading) return;
    try {
      setLoading(true);
      if (customerId)
        await sendOTP({ prospectId: customerId }).then((res) => {
          if (res) toast.success("Código reenviado");
        });
      reset();
    } catch {
      toast.error("Error al reenviar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className=" mx-auto border-none shadow-none bg-[#1e1e1e] p-5">
      {/* <Card className="w-full max-w-md border-none bg-transparent shadow-none"> */}

      {/* Header */}
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-3xl font-bold text-white pb-2">
          Verifica tu código
        </CardTitle>
        <CardDescription className="text-sm text-gray-400">
          Para continuar, ingrese el código que enviamos por whasapp a
        </CardDescription>

        {/* Phone display llamanvo y novedo */}
        <div className="m-auto mt-1 space-x-2 inline-flex items-center gap-2 bg-linear-to-r from-orange-500/20 via-orange-400/20 to-orange-500/20 px-4 py-2 rounded-full border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
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
            {/* <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> */}
          </div>
          {/* +523312486283 */}
          <span className="text-lg font-semibold text-white tracking-wide ">
            {phone
              ? ` ${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6, 10)} `
              : "Sin número"}
          </span>
          <span className="animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className="text-green-400"
            >
              <path
                fill="currentColor"
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.162-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 mt-4 ">
        {/* OTP */}
        <div className="flex justify-center">
          <InputOTP maxLength={6} onComplete={handleVerify}>
            <InputOTPGroup className="gap-3 px-2 ">
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
        <div className="text-center">
          {isActive ? (
            <div className="space-y-1">
              <p className="text-white text-sm">No has recibido el código. </p>
              <p className="text-white text-sm">
                Podrás reenviarlo en{" "}
                <span className="text-orange-400 font-medium">{seconds}s</span>
              </p>
            </div>
          ) : (
            <Button
              onClick={handleResend}
              disabled={loading}
              className=" bg-orange-500 hover:bg-orange-600"
            >
              Reenviar código
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
