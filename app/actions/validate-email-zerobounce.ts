"use server";

/**
 * ZeroBounce Email Validation API
 * 
 * Docs: https://www.zerobounce.net/docs/api-documentation/
 * Free tier: 100 validaciones/mes
 */

import {
  isKnownDisposableDomain,
  addToDisposableList,
  getDisposableList,
  KNOWN_DISPOSABLE_DOMAINS,
} from "@/lib/disposable-domains";

interface ZeroBounceResponse {
  email: string;
  status: "valid" | "invalid" | "catch_all" | "unknown" | "spamtrap" | "abuse" | "do_not_mail" | "disposable";
  sub_status: string;
  free_email: boolean;
  disposable: boolean;
  roleBased: boolean;
  catch_all: boolean;
  scandalized: boolean;
  domain: string;
  domain_age_days: string;
  mx_found: boolean;
  mx_record: string;
  smtp_provider: string;
  firstname: string;
  lastname: string;
  gender: string;
  location: string;
  city: string;
  region: string;
  country: string;
  zipcode: string;
  country_code: string;
  score: number;
  private: boolean;
  corporate: boolean;
  webhook_url: string;
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

// Cache de créditos para no consultar cada vez (se renueva cada 5 minutos)
let creditsCache: { data: { total: number; used: number; remaining: number }; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtener créditos con cache
 */
async function getCreditsWithCache(): Promise<{ remaining: number; valid: boolean }> {
  const apiKey = process.env.ZEROBOUNCE_API_KEY;

  if (!apiKey) {
    return { remaining: 0, valid: false };
  }

  // Verificar cache
  const now = Date.now();
  if (creditsCache && now - creditsCache.timestamp < CACHE_DURATION) {
    return { remaining: creditsCache.data.remaining, valid: true };
  }

  try {
    const response = await fetch(
      `https://api.zerobounce.net/v2/getcredits?apikey=${apiKey}`,
      { method: "GET" }
    );

    if (!response.ok) {
      return { remaining: 0, valid: false };
    }

    const data = await response.json();
    const remaining = data.Remaining || 0;

    // Actualizar cache
    creditsCache = {
      data: {
        total: data.Total || 0,
        used: data.Used || 0,
        remaining,
      },
      timestamp: now,
    };

    return { remaining, valid: true };
  } catch (error) {
    console.error("[ZeroBounce] Error getting credits:", error);
    return { remaining: 0, valid: false };
  }
}

/**
 * Verificar si debemos usar ZeroBounce (tiene créditos disponibles)
 */
async function shouldUseZeroBounce(): Promise<{ canUse: boolean; creditsRemaining: number }> {
  const { remaining, valid } = await getCreditsWithCache();
  
  if (!valid || remaining <= 0) {
    console.warn("[ZeroBounce] No credits remaining or API error");
    return { canUse: false, creditsRemaining: 0 };
  }

  // Reservar al menos 10 créditos para casos críticos
  if (remaining <= 10) {
    console.warn(`[ZeroBounce] Low credits (${remaining}), using fallback validation`);
    return { canUse: false, creditsRemaining: remaining };
  }

  return { canUse: true, creditsRemaining: remaining };
}

export async function validateEmailWithZeroBounce(
  email: string
): Promise<EmailValidationResult> {
  const apiKey = process.env.ZEROBOUNCE_API_KEY;

  // Si no hay API key, usar solo validación local
  if (!apiKey) {
    console.warn("[ZeroBounce] API key not configured, skipping validation");
    return {
      isValid: true,
      isDisposable: false,
      isRoleBased: false,
      isFreeEmail: false,
      score: 50,
      status: "unknown",
      subStatus: "",
      reasons: ["ZeroBounce not configured"],
      verificationLimited: true,
    };
  }

  // 1. Verificar si ZeroBounce está disponible (tiene créditos)
  const { canUse: canUseZeroBounce, creditsRemaining } = await shouldUseZeroBounce();

  // 2. Verificar lista local primero (gratis, instantáneo)
  if (isKnownDisposableDomain(email)) {
    console.log(`[ZeroBounce] Email ${email} detected by local list (disposable)`);
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
      creditsRemaining,
    };
  }

  // 3. Si no hay créditos o está limitado, retornar con mensaje
  if (!canUseZeroBounce) {
    console.warn(`[ZeroBounce] Credits exhausted (${creditsRemaining} remaining). Using fallback only.`);
    return {
      isValid: true,
      isDisposable: false,
      isRoleBased: false,
      isFreeEmail: false,
      score: 50,
      status: "unknown",
      subStatus: "",
      reasons: ["ZeroBounce credits exhausted, using local validation only"],
      verificationLimited: true,
      creditsRemaining,
    };
  }

  // 4. Usar ZeroBounce API
  try {
    const encodedEmail = encodeURIComponent(email);
    const url = `https://api.zerobounce.net/v2/validate?email=${encodedEmail}&apikey=${apiKey}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

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
        creditsRemaining,
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

    // Verificar sub_status para más detalles
    if (data.sub_status) {
      if (data.sub_status.includes("disposable")) {
        isDisposable = true;
        reasons.push("Disposable subdomain detected");
      }
      if (data.sub_status.includes("role")) {
        reasons.push("Role-based email (no personal)");
      }
    }

    return {
      isValid,
      isDisposable,
      isRoleBased: data.roleBased || data.sub_status.includes("role"),
      isFreeEmail: data.free_email || false,
      score: data.score || 50,
      status: data.status,
      subStatus: data.sub_status || "",
      reasons,
      verificationLimited: false,
      creditsRemaining: creditsRemaining - 1,
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
      creditsRemaining,
    };
  }
}

/**
 * Obtener créditos disponibles (para debugging/monitoring)
 */
export async function getZeroBounceCredits(): Promise<{
  total: number;
  used: number;
  remaining: number;
} | null> {
  const apiKey = process.env.ZEROBOUNCE_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.zerobounce.net/v2/getcredits?apikey=${apiKey}`,
      { method: "GET" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      total: data.Total || 0,
      used: data.Used || 0,
      remaining: data.Remaining || 0,
    };
  } catch (error) {
    console.error("[ZeroBounce] Error getting credits:", error);
    return null;
  }
}

export default validateEmailWithZeroBounce;