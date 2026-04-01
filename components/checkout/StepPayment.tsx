import { useCheckoutStore } from "@/store/useCheckoutStore";
import PaymentBrick from "../payment/PaymentBrick";

interface StepPaymentProps {
  planId: string;
}

// export default function StepPayment() {
//   const { setStep, setEmail, planId } = useCheckoutStore();
export default function StepPayment({ planId }: StepPaymentProps) {
  const { setStep, setEmail } = useCheckoutStore();

  return (
    <div className="space-y-4 max-w-lg min-w-md mx-auto">
      <h2 className="text-2xl text-orange-500 font-bold text-center">
        Completa tu pago
      </h2>

      {/* <PaymentBrickW planId={planId} /> */}
      {/* <PaymentBrick planId={planId} /> */}
      <PaymentBrick planId={planId} />
    </div>
  );
}
