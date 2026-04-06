import { create } from "zustand";

type Step = "email" | "otp" | "payment";

interface CheckoutState {
  step: Step;
  email: string;
  phone: string;
  prospectId: string;
  plan: Membership | null;

  setStep: (step: Step) => void;
  setEmail: (email: string) => void;
  setPhone: (phone: string) => void;
  setPlan: (plan: Membership) => void;
  setProspectId: (prospectId: string) => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  step: "email",
  email: "",
  phone: "",
  prospectId: "",
  plan: null,
  setStep: (step) => set({ step }),
  setEmail: (email) => set({ email }),
  setPhone: (phone) => set({ phone }),
  setProspectId: (prospectId) => set({ prospectId }),

  setPlan: (plan) => set({ plan }),
  clearPlan: () => set({ plan: null }),
}));

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
    idGroupActivity: number;
    name: string;
    idBranch: number;
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
}
