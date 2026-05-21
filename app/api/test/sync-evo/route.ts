import { syncProspectToEvoAction } from "@/app/actions/evoSyncActions";

/**
 * API route temporal para probar syncProspectToEvo manualmente.
 *
 * GET  /api/test/sync-evo?prospectId=UUID
 * POST /api/test/sync-evo   body: { "prospectId": "UUID" }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prospectId = searchParams.get("prospectId");

  if (!prospectId) {
    return Response.json(
      { error: "Falta query param: prospectId" },
      { status: 400 },
    );
  }

  const result = await syncProspectToEvoAction(prospectId);
  return Response.json(result);
}

export async function POST(req: Request) {
  let prospectId: string | null = null;

  try {
    const body = await req.json();
    prospectId = body?.prospectId ?? null;
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!prospectId) {
    return Response.json(
      { error: "Falta prospectId en el body" },
      { status: 400 },
    );
  }

  const result = await syncProspectToEvoAction(prospectId);
  return Response.json(result);
}
