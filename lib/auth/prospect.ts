import { db } from "@/lib/db/index";
import { prospects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getProspectByEmail(email: string) {
  const prospect = await db
    .select()
    .from(prospects)
    .where(eq(prospects.email, email));
  console.debug("🚀 ~ getProspectByEmail ~ prospect:", prospect[0]);

  return prospect;
}
