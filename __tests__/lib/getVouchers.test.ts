// getVouchers.test.ts
import { getVouchers } from "@/lib/evoApi";
import { describe, expect, it, vi } from "vitest";

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ id: 1, name: "Voucher test" }]),
  } as any),
);

describe("getVouchers", () => {
  it("debería retornar vouchers normalizados", async () => {
    const result = await getVouchers();

    expect(result.length).toBeGreaterThan(0);
  });
});
