import { useCheckoutStore } from "@/store/useCheckoutStore";
import { beforeEach, describe, expect, it } from "vitest";

describe("useCheckoutStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useCheckoutStore.setState({
      step: "email",
      email: "",
      phone: "",
      prospectId: "",
      prospect: null,
      plan: null,
      branch: null,
    });
  });

  describe("initial state", () => {
    it("should have email as default step", () => {
      const state = useCheckoutStore.getState();
      expect(state.step).toBe("email");
    });

    it("should have empty initial values", () => {
      const state = useCheckoutStore.getState();
      expect(state.email).toBe("");
      expect(state.phone).toBe("");
      expect(state.prospectId).toBe("");
      expect(state.prospect).toBeNull();
      expect(state.plan).toBeNull();
      expect(state.branch).toBeNull();
    });
  });

  describe("setStep", () => {
    it("should update step to otp", () => {
      useCheckoutStore.getState().setStep("otp");
      expect(useCheckoutStore.getState().step).toBe("otp");
    });

    it("should update step to payment", () => {
      useCheckoutStore.getState().setStep("payment");
      expect(useCheckoutStore.getState().step).toBe("payment");
    });

    it("should allow step changes back to email", () => {
      useCheckoutStore.getState().setStep("payment");
      useCheckoutStore.getState().setStep("email");
      expect(useCheckoutStore.getState().step).toBe("email");
    });
  });

  describe("setEmail", () => {
    it("should update email", () => {
      useCheckoutStore.getState().setEmail("test@example.com");
      expect(useCheckoutStore.getState().email).toBe("test@example.com");
    });
  });

  describe("setPhone", () => {
    it("should update phone", () => {
      useCheckoutStore.getState().setPhone("+52 1234567890");
      expect(useCheckoutStore.getState().phone).toBe("+52 1234567890");
    });
  });

  describe("setPlan", () => {
    it("should update plan", () => {
      const mockPlan = {
        idMembership: 1,
        idBranch: 1,
        nameMembership: "Premium",
        membershipType: "mensual",
        durationType: "meses",
        duration: 1,
        updateDate: "2024-01-01",
        value: 500,
        maxAmountInstallments: 3,
        description: "Plan Premium",
        urlSale: "https://example.com",
        onlineSalesObservations: "",
        differentials: [],
        accessBranches: [],
        typePromotionalPeriod: 0,
        valuePromotionalPeriod: 0,
        monthsPromotionalPeriod: 0,
        daysPromotionalPeriod: 0,
        minPeriodStayMembership: 0,
        installmentsPromotionalPeriod: 0,
        activitiesGroups: [],
        inactive: false,
        displayName: "Premium",
        salesPage: [],
        allowsCancellationByApp: true,
        externalSaleAvailable: true,
        acceptEnrollment: true,
        enrollmentRequired: false,
      };

      useCheckoutStore.getState().setPlan(mockPlan as never);
      expect(useCheckoutStore.getState().plan).not.toBeNull();
      expect(useCheckoutStore.getState().plan?.nameMembership).toBe("Premium");
    });
  });

  describe("clearPlan", () => {
    it("should set plan to null", () => {
      const mockPlan = { idMembership: 1, idBranch: 1 } as never;
      useCheckoutStore.getState().setPlan(mockPlan);
      useCheckoutStore.getState().clearPlan();
      expect(useCheckoutStore.getState().plan).toBeNull();
    });
  });

  describe("setProspect", () => {
    it("should update prospect", () => {
      const mockProspect = {
        id: "123",
        firstName: "John",
        lastName: "Doe",
        areaCode: "+52",
        phone: "1234567890",
        email: "john@example.com",
        curp: "ABC123456",
        idMember: 1,
      };

      useCheckoutStore.getState().setProspect(mockProspect);
      expect(useCheckoutStore.getState().prospect).not.toBeNull();
      expect(useCheckoutStore.getState().prospect?.firstName).toBe("John");
    });
  });

  describe("setProspectId", () => {
    it("should update prospectId", () => {
      useCheckoutStore.getState().setProspectId("new-prospect-id");
      expect(useCheckoutStore.getState().prospectId).toBe("new-prospect-id");
    });
  });

  describe("setBranch", () => {
    it("should update branch", () => {
      useCheckoutStore.getState().setBranch({ name: "Sucursal Centro" });
      expect(useCheckoutStore.getState().branch).not.toBeNull();
      expect(useCheckoutStore.getState().branch?.name).toBe("Sucursal Centro");
    });
  });
});
