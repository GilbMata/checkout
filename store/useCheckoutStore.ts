import { create } from "zustand";

type Step = "email" | "otp" | "payment";

interface CheckoutState {
  step: Step;
  email: string;
  phone: string;
  plan: Membership | null;
  prospect: Prospect | null;
  branch: Branch | null;
  prospectId: string;

  setStep: (step: Step) => void;
  setEmail: (email: string) => void;
  setPhone: (phone: string) => void;
  setPlan: (plan: Membership) => void;
  setProspect: (prospect: Prospect) => void;
  clearPlan: () => void;
  setBranch: (branch: Branch) => void;
  setProspectId: (id: string) => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  step: "email",
  email: "",
  phone: "",
  prospectId: "",
  prospect: null,
  plan: null,
  branch: null,
  setBranch: (branch) => set({ branch }),
  setStep: (step) => set({ step }),
  setEmail: (email) => set({ email }),
  setPhone: (phone) => set({ phone }),
  setProspect: (prospect) => set({ prospect }),
  setProspectId: (id) => set({ prospectId: id }),
  setPlan: (plan) => set({ plan }),
  clearPlan: () => set({ plan: null }),
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
}
