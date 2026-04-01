import { create } from "zustand";

type Step = "email" | "otp" | "payment";

interface CheckoutState {
  step: Step;
  email: string;
  phone: string;
  planId: string;
  prospectId: string;

  setStep: (step: Step) => void;
  setEmail: (email: string) => void;
  setPhone: (phone: string) => void;
  setPlanId: (planId: string) => void;
  setProspectId: (prospectId: string) => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  step: "email",
  email: "",
  phone: "",
  planId: "",
  prospectId: "",
  setPlanId: (planId) => set({ planId }),
  setStep: (step) => set({ step }),
  setEmail: (email) => set({ email }),
  setPhone: (phone) => set({ phone }),
  setProspectId: (prospectId) => set({ prospectId }),
}));
