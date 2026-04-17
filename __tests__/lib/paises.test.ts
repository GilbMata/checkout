import { DEFAULT_COUNTRY, LATAM_COUNTRIES, type Country } from "@/lib/paises";
import { describe, expect, it } from "vitest";

describe("paises", () => {
  describe("LATAM_COUNTRIES", () => {
    it("should have at least 10 countries", () => {
      expect(LATAM_COUNTRIES.length).toBeGreaterThan(10);
    });

    it("should have valid country structure", () => {
      const firstCountry = LATAM_COUNTRIES[0];
      expect(firstCountry).toHaveProperty("code");
      expect(firstCountry).toHaveProperty("name");
      expect(firstCountry).toHaveProperty("iso");
    });

    it("should have México as first country", () => {
      expect(DEFAULT_COUNTRY.name).toBe("México");
      expect(DEFAULT_COUNTRY.code).toBe("+52");
    });

    it("should have valid country codes", () => {
      LATAM_COUNTRIES.forEach((country: Country) => {
        expect(country.code).toMatch(/^\+\d+$/);
      });
    });

    it("should have unique ISO codes", () => {
      const isoCodes = LATAM_COUNTRIES.map((c: Country) => c.iso);
      const uniqueCodes = new Set(isoCodes);
      expect(uniqueCodes.size).toBe(isoCodes.length);
    });
  });

  describe("DEFAULT_COUNTRY", () => {
    it("should be México", () => {
      expect(DEFAULT_COUNTRY.name).toBe("México");
      expect(DEFAULT_COUNTRY.iso).toBe("MX");
    });
  });
});
