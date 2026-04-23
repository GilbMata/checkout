import { getVouchers } from "@/lib/evoApi";

async function main() {
  try {
    const data = await getVouchers({
      idBranch: 1,
      type: 1,
      valid: true,
    });

    console.log("RESULT:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
}

main();
