import { prisma } from "@/lib/db/index";

export async function getProspectByEmail(email: string) {
  const prospect = await prisma.prospects.findMany({
    where: { email },
  });
  console.debug("🚀 ~ getProspectByEmail ~ prospect:", prospect[0]);

  return prospect;
}
