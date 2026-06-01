import { syncProspectToEvoAction } from "@/app/actions/evoSyncActions";

/**
 * API route temporal para probar syncProspectToEvo manualmente.
 *
 * GET  /api/test/sync-evo?prospectId=UUID&idMembership=123&idBranch=456
 * POST /api/test/sync-evo   body: { "prospectId": "UUID", "idMembership": 123, "idBranch": 456 }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prospectId = searchParams.get("prospectId");
  const idMembership = searchParams.get("idMembership");
  const idBranch = searchParams.get("idBranch");

  if (!prospectId || !idMembership || !idBranch) {
    return Response.json(
      {
        error:
          "Faltan parámetros: prospectId, idMembership, idBranch",
      },
      { status: 400 },
    );
  }

  const result = await syncProspectToEvoAction(
    prospectId,
    Number(idMembership),
    Number(idBranch),
  );
  return Response.json(result);
}

export async function POST(req: Request) {
  let prospectId: string | null = null;
  let idMembership: number | undefined;
  let idBranch: number | undefined;

  try {
    const body = await req.json();
    prospectId = body?.prospectId ?? null;
    idMembership = body?.idMembership ?? undefined;
    idBranch = body?.idBranch ?? undefined;
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!prospectId || !idMembership || !idBranch) {
    return Response.json(
      {
        error:
          "Faltan campos en el body: prospectId, idMembership, idBranch",
      },
      { status: 400 },
    );
  }

  const result = await syncProspectToEvoAction(
    prospectId,
    idMembership,
    idBranch,
  );
  return Response.json(result);
}
