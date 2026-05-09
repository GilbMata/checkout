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
    subscriptionId: "81e79e3e-15b3-40ba-8db2-eac4b34ac349",
  });
  const after = await prisma.magicLinks.count();
  return NextResponse.json({ success: result.success, before, after, result });
}
