"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import { Button } from "./button";

interface PlanNotFoundProps {
  redirectUrl?: string;
  countdownSeconds?: number;
  title?: string;
  message?: string;
  showCountdown?: boolean;
}

export function PlanNotFound({
  redirectUrl = "https://station24.com.mx/unete",
  countdownSeconds = 5,
  title = "Plan no encontrado",
  message = "Serás redirigido automáticamente en unos segundos...",
  showCountdown = true,
}: PlanNotFoundProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRedirecting(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto redirect when countdown reaches 0
    const redirectTimeout = setTimeout(() => {
      window.location.href = redirectUrl;
    }, countdownSeconds * 1000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimeout);
    };
  }, [redirectUrl, countdownSeconds]);

  const handleRedirect = () => {
    setIsRedirecting(true);
    window.location.href = redirectUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <div className="text-center max-w-md w-full">
        {/* Icon */}
        <div className="mx-auto mb-6 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircleIcon className="w-10 h-10 text-red-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          {title}
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>

        {/* Countdown indicator */}
        {showCountdown && !isRedirecting && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2Icon className="w-4 h-4 animate-spin" />
              <span>Redireccionando en {countdown} segundos...</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                style={{
                  width: `${((countdownSeconds - countdown) / countdownSeconds) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Loading state when redirecting */}
        {isRedirecting && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 text-orange-500">
              <Loader2Icon className="w-5 h-5 animate-spin" />
              <span>Redireccionando...</span>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Button
          onClick={handleRedirect}
          disabled={isRedirecting}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isRedirecting ? (
            <>
              <Loader2Icon className="w-4 h-4 animate-spin" />
              Redireccionando...
            </>
          ) : (
            <>
              Ir ahora
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </Button>

        {/* Skip countdown hint */}
        {!isRedirecting && (
          <p className="mt-4 text-xs text-gray-400">
            ¿Prefieres ir inmediatamente? Haz clic en el botón de arriba.
          </p>
        )}
      </div>
    </div>
  );
}

export default PlanNotFound;