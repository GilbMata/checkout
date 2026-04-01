"use client";

import { cn } from "@/lib/utils";
import { isDisposable } from "@isdisposable/js";
import { AlertCircle, Mail } from "lucide-react";

interface DisposableEmailAlertProps {
  className?: string;
  showIcon?: boolean;
}

export function DisposableEmailAlert({
  className,
  showIcon = true,
}: DisposableEmailAlertProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200",
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      {showIcon && (
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
      )}
      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm text-amber-200">
          Correo temporal no permitido
        </p>
        <p className="text-xs text-amber-300/80">
          Los correos temporales o desechables no están permitidos. Usa tu
          correo personal para continuar con el registro de tu membresía.
        </p>
      </div>
    </div>
  );
}

interface EmailDomainInfoProps {
  email: string;
  className?: string;
}

export function EmailDomainInfo({ email, className }: EmailDomainInfoProps) {
  if (!email || !email.includes("@")) return null;

  const domain = email.split("@")[1];
  const isDisposableEmail = isDisposable(email);

  if (!isDisposableEmail) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs",
        className,
      )}
      role="status"
    >
      <Mail className="w-4 h-4 shrink-0" />
      <span>
        El dominio <strong>{domain}</strong> es temporal. Usa un correo real.
      </span>
    </div>
  );
}

/**
 * Hook para validar si un email es temporal en tiempo real
 */
export function useDisposableEmailValidation() {
  const checkEmail = (email: string): boolean => {
    if (!email || !email.includes("@")) return false;
    return isDisposable(email);
  };

  return { checkEmail, isDisposable };
}
