"use client";

/**
 * ZeroBounce Email Validation API Client
 * 
 * Docs: https://www.zerobounce.net/docs/api-documentation/
 * Free tier: 100 validaciones/mes
 */

import {
  isKnownDisposableDomain,
} from "@/lib/disposable-domains";

export interface ZeroBounceResponse {
  email: string;
  status: "valid" | "invalid" | "catch_all" | "unknown" | "spamtrap" | "abuse" | "do_not_mail" | "disposable";
  sub_status: string;
  free_email: boolean;
  disposable: boolean;
  roleBased: boolean;
  catch_all: boolean;
  score: number;
}

export interface EmailValidationResult {
  isValid: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  isFreeEmail: boolean;
  score: number;
  status: string;
  subStatus: string;
  reasons: string[];
  verificationLimited: boolean;
  creditsRemaining?: number;
}

/**
 * Validar email usando ZeroBounce API
 * Primero verifica contra lista local, luego contra ZeroBounce
 */
export async function validateEmailWithZeroBounce(
  email: string
): Promise<EmailValidationResult> {
  // 1. Verificar lista local primero (gratis, instantáneo)
  if (isKnownDisposableDomain(email)) {
    return {
      isValid: false,
      isDisposable: true,
      isRoleBased: false,
      isFreeEmail: false,
      score: 0,
      status: "disposable",
      subStatus: "known_domain",
      reasons: ["Disposable domain detected by local list"],
      verificationLimited: false,
    };
  }

  // 2. Usar ZeroBounce API
  try {
    const response = await fetch(`/api/validate-email?email=${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      console.error(`[ZeroBounce] API error: ${response.status}`);
      return {
        isValid: true,
        isDisposable: false,
        isRoleBased: false,
        isFreeEmail: false,
        score: 50,
        status: "error",
        subStatus: "",
        reasons: [`API error: ${response.status}`],
        verificationLimited: true,
      };
    }

    const data: ZeroBounceResponse = await response.json();

    // Analizar resultados
    const reasons: string[] = [];
    let isDisposable = false;
    let isValid = true;

    // Verificar si es disposable según ZeroBounce
    if (data.disposable || data.status === "disposable") {
      isDisposable = true;
      reasons.push("Disposable email detected by ZeroBounce");
    }

    // Verificar status
    switch (data.status) {
      case "invalid":
        isValid = false;
        reasons.push("Invalid email address");
        break;
      case "spamtrap":
        isValid = false;
        reasons.push("Spam trap detected");
        break;
      case "abuse":
        isValid = false;
        reasons.push("Abuse email detected");
        break;
      case "do_not_mail":
        isValid = false;
        reasons.push("Do not mail");
        break;
      case "catch_all":
        reasons.push("Catch-all domain");
        break;
      case "unknown":
        reasons.push("Email status unknown");
        break;
    }

    // Verificar sub_status
    if (data.sub_status) {
      if (data.sub_status.includes("disposable")) {
        isDisposable = true;
        reasons.push("Disposable subdomain detected");
      }
      if (data.sub_status.includes("role")) {
        reasons.push("Role-based email");
      }
    }

    return {
      isValid,
      isDisposable,
      isRoleBased: data.roleBased || data.sub_status?.includes("role"),
      isFreeEmail: data.free_email || false,
      score: data.score || 50,
      status: data.status,
      subStatus: data.sub_status || "",
      reasons,
      verificationLimited: false,
    };
  } catch (error) {
    console.error("[ZeroBounce] Validation error:", error);
    return {
      isValid: true,
      isDisposable: false,
      isRoleBased: false,
      isFreeEmail: false,
      score: 50,
      status: "error",
      subStatus: "",
      reasons: ["Validation error"],
      verificationLimited: true,
    };
  }
}

// Exportar también la función de validación local para uso directo
export { isKnownDisposableDomain } from "@/lib/disposable-domains";