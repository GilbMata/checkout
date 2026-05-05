import { sendMsj } from "@/app/actions/sendMsj";
import { prisma } from "@/lib/db/index";
import { NextResponse } from "next/server";
export async function GET() {
  const prospect = await prisma.prospects.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (!prospect)
    return NextResponse.json({ error: "No hay prospects" }, { status: 400 });
  const before = await prisma.magicLinks.count();
  const result = await sendMsj({
    prospectId: prospect.id,
    planName: "Plan Premium",
    type: "paymentfailed",
  });
  const after = await prisma.magicLinks.count();
  return NextResponse.json({ success: result.success, before, after, result });
}
