"use server";

import { mp } from "@/lib/mercadopago";
import { Payment } from "mercadopago";
import { getSession } from "@/lib/auth/session";

export async function processPayment(data: any) {
    const session = await getSession();

    // if (!session) {
    //     throw new Error("No autorizado");
    // }
    console.debug("🚀 ~ processPayment ~ formDatal,:", data.formData,)

    try {
        const payment = new Payment(mp);
        const response = await payment.create({
            body: {
                transaction_amount: 1000,
                token: data.formData.token,
                description: "Plan gimnasio",
                installments: data.formData.installments,
                payment_method_id: data.formData.payment_method_id,

                payer: {
                    email: "test_user_123@test.com",
                },

                metadata: {
                    userId: 1,
                },
            },
        });

        return {
            status: response.status,
            id: response.id,
        };

    } catch (error) {
        console.error(error);
        throw new Error("Error procesando pago");
    }
}