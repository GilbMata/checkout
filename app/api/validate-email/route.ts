import { validateEmail } from "@/lib/email-validation";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Email Validation API Route
 *
 * Provides real-time email validation via HTTP for client-side
 * validation (e.g., with debounce while user types).
 *
 * For form submissions, use the validateEmailAction server action instead.
 *
 * Rate limiting: 30 requests per minute per IP
 */

const requestSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

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

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email } = parseResult.data;

    // Perform validation
    const result = validateEmail(email);

    // Return result
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Email validation API error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: Date.now(),
  });
}
