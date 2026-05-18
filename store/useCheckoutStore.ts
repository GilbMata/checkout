import { create } from "zustand";
import type { VoucherDiscount } from "@/lib/evoApi";

type Step = "phone-only" | "full-form" | "email" | "otp" | "payment" | "";

interface CheckoutState {
  step: Step;
  email: string;
  phone: string;
  areaCode: string; // Código de área del teléfono
  plan: Membership | null;
  prospect: Prospect | null;
  branch: Branch | null;
  prospectId: string;

  // Voucher state
  voucherCode: string;
  voucherDiscount: VoucherDiscount | null;

  // Turnstile state
  turnstileToken: string;
  turnstileVerified: boolean;

  setStep: (step: Step) => void;
  setEmail: (email: string) => void;
  setPhone: (phone: string) => void;
  setAreaCode: (areaCode: string) => void;
  setPlan: (plan: Membership) => void;
  setProspect: (prospect: Prospect) => void;
  clearPlan: () => void;
  setBranch: (branch: Branch) => void;
  setProspectId: (id: string) => void;
  setVoucherCode: (code: string) => void;
  setVoucherDiscount: (discount: VoucherDiscount | null) => void;
  clearVoucher: () => void;
  setTurnstileToken: (token: string) => void;
  setTurnstileVerified: (verified: boolean) => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  step: "phone-only",
  email: "",
  phone: "",
  areaCode: "",
  prospectId: "",
  prospect: null,
  plan: null,
  branch: null,
  voucherCode: "",
  voucherDiscount: null,
  turnstileToken: "",
  turnstileVerified: false,
  setBranch: (branch) => set({ branch }),
  setStep: (step) => set({ step }),
  setEmail: (email) => set({ email }),
  setPhone: (phone) => set({ phone }),
  setAreaCode: (areaCode) => set({ areaCode }),
  setProspect: (prospect) => set({ prospect }),
  setProspectId: (id) => set({ prospectId: id }),
  setPlan: (plan) => set({ plan }),
  clearPlan: () => set({ plan: null }),
  setVoucherCode: (code) => set({ voucherCode: code }),
  setVoucherDiscount: (discount) => set({ voucherDiscount: discount }),
  clearVoucher: () => set({ voucherCode: "", voucherDiscount: null }),
  setTurnstileToken: (token) => set({ turnstileToken: token }),
  setTurnstileVerified: (verified) => set({ turnstileVerified: verified }),
}));

export interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  areaCode: string;
  phone: string;
  email: string;
  curp: string;
  // paymentPending: string;
  idMember: number;
}
export interface Branch {
  name: string;
}

export interface Membership {
  idMembership: number;
  idBranch: number;
  nameMembership: string;
  membershipType: string;
  durationType: string;
  duration: number;
  updateDate: string;
  value: number;
  maxAmountInstallments: number;
  description: string;
  urlSale: string;
  onlineSalesObservations: string;

  differentials: {
    title: string;
    order: number;
  }[];

  accessBranches: {
    idBranch: number;
    name: string;
  }[];

  additionalService?: {
    idService: number;
    name: string;
    value: number;
  };

  serviceYearly?: {
    idService: number;
    name: string;
    value: number;
    type: number;
    billingMonth: number;
    billingDay: number;
    billingAfterMonths: number;
    installments: number;
  };

  typePromotionalPeriod: number;
  valuePromotionalPeriod: number;
  monthsPromotionalPeriod: number;
  daysPromotionalPeriod: number;

  minPeriodStayMembership: number;
  installmentsPromotionalPeriod: number;

  activitiesGroups: {
    idActivity: number;
    name: string;
    photo: string;
    color: string;
    description: string;
    showOnMobile: boolean;
  }[];

  inactive: boolean;
  displayName: string;

  entries: {
    entriesQuantity: number;
    idEntriesType: number;
    entriesTypeDescription: string;
  };

  salesPage: {
    idSalesPage: number;
    order: number;
    salesPageDescription: string;
  }[];

  allowsCancellationByApp: boolean;
  externalSaleAvailable: boolean;
  acceptEnrollment: boolean;
  enrollmentRequired: boolean;

  // Recurrence - viene de la configuración del plan en Evo/MP
  // recurrenceInterval?: "weekly" | "monthly" | "bimonthly" | "yearly";

  // MP Preapproval Plan ID para suscripciones con plan asociado
  // mpPreapprovalPlanId?: string;
}
