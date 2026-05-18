import { NextRequest, NextResponse } from "next/server";

/**
 * ZeroBounce Email Validation API Route
 * 
 * Docs: https://www.zerobounce.net/docs/api-documentation/
 * Free tier: 100 validaciones/mes
 * 
 * Rate limiting: 30 requests per minute per IP
 */

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30;

// In-memory rate limiting (per-process)
// For production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Get client IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    // Get email from query params
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ZEROBOUNCE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ZeroBounce no configurado" },
        { status: 500 },
      );
    }

    // Call ZeroBounce API
    const url = `https://api.zerobounce.net/v2/validate?email=${encodeURIComponent(email)}&apikey=${apiKey}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[ZeroBounce] API error: ${response.status}`);
      return NextResponse.json(
        { error: "Error validando email" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Return ZeroBounce response directly
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[ZeroBounce] Validation error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}