import { otpSchema } from "@/validations/otpSchema";
import { describe, expect, it } from "vitest";

describe("otpSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid 6-digit OTP", () => {
      const validOtp = "123456";
      const result = otpSchema.safeParse({ otp: validOtp });
      expect(result.success).toBe(true);
    });

    it("should accept OTP with leading zeros", () => {
      const validOtp = "000000";
      const result = otpSchema.safeParse({ otp: validOtp });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject OTP shorter than 6 digits", () => {
      const invalidOtp = "12345";
      const result = otpSchema.safeParse({ otp: invalidOtp });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Código incompleto");
      }
    });

    it("should reject OTP longer than 6 digits", () => {
      const invalidOtp = "1234567";
      const result = otpSchema.safeParse({ otp: invalidOtp });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Código inválido");
      }
    });

    it("should reject non-numeric OTP", () => {
      const invalidOtp = "abcde1";
      const result = otpSchema.safeParse({ otp: invalidOtp });
      expect(result.success).toBe(false);
    });

    it("should reject empty OTP", () => {
      const result = otpSchema.safeParse({ otp: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("type inference", () => {
    it("should infer correct type from schema", () => {
      const parsed = otpSchema.parse({ otp: "123456" });
      expect(parsed.otp).toBe("123456");
    });
  });
});
