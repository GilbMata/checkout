import { CURP_STATES } from "@/lib/estados";
import { describe, expect, it } from "vitest";

describe("estados", () => {
  describe("CURP_STATES", () => {
    it("should have all 32 Mexican states plus foreign", () => {
      expect(Object.keys(CURP_STATES).length).toBeGreaterThanOrEqual(32);
    });

    it("should have valid state codes and names", () => {
      expect(CURP_STATES["AS"]).toBe("Aguascalientes");
      expect(CURP_STATES["BC"]).toBe("Baja California");
      expect(CURP_STATES["DF"]).toBe("Ciudad de México");
      expect(CURP_STATES["NE"]).toBe("Nacido en el extranjero");
    });

    it("should have string values for all keys", () => {
      Object.entries(CURP_STATES).forEach(([key, value]) => {
        expect(typeof key).toBe("string");
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it("should have uppercase keys", () => {
      Object.keys(CURP_STATES).forEach((key) => {
        expect(key).toBe(key.toUpperCase());
      });
    });
  });
});
