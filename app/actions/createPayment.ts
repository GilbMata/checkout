"use server";

import { prisma } from "@/lib/db/index";
import { mp } from "@/lib/mercadopago";
import { Preference } from "mercadopago";
import { getMembershipAction } from "./evoMember";

interface CreatePreferenceParams {
  planId: string;
  prospectId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export async function createPreference(params: CreatePreferenceParams) {
  const { planId, prospectId, email, firstName, lastName, phone } = params;

  // Obtener datos del plan desde EVO
  const planResponse = await getMembershipAction(planId);
  let plan: any = null;

  if (planResponse?.list && planResponse.qtde > 0) {
    plan = planResponse.list[0];
  }

  if (!plan) {
    throw new Error("Plan no encontrado");
  }

  // URL del webhook para notificaciones
  const notificationUrl = `${process.env.APP_URL}/api/payment/webhook`;

  // URLs de retorno - usar checkout
  const backUrls = {
    success: `${process.env.APP_URL}/checkout/success`,
    failure: `${process.env.APP_URL}/checkout/failure`,
    pending: `${process.env.APP_URL}/checkout/pending`,
  };

  const preference = new Preference(mp);

  // Construir el cuerpo de la preferencia
  const preferenceBody = {
    items: [
      {
        id: String(plan.idMembership),
        title: plan.displayName || "Plan Gimnasio",
        description: `${plan.displayName} - Membresía mensual`,
        quantity: 1,
        unit_price: plan.valuePromotionalPeriod,
        currency_id: "MXN",
      },
    ],
    payer: {
      email: email,
      name: firstName || "",
      surname: lastName || "",
      phone: phone
        ? {
            area_code: phone.slice(0, 2),
            number: phone.slice(2),
          }
        : undefined,
    },
    // Configuración de payment
    payment_methods: {
      excluded_payment_methods: [],
      excluded_payment_types: [],
      installments: 3, // Máximo cuotas
    },
    // URLs de retorno
    back_urls: backUrls,
    // Auto retornar cuando se apruebe
    auto_return: "approved",
    // Webhook para notificaciones
    notification_url: notificationUrl,
    // Referencia externa (nuestra ID de prospecto)
    external_reference: prospectId,
    // Statement descriptor (nombre que aparece en el estado de cuenta)
    statement_descriptor: "STATION 24",
    // Configuración adicional
    binary_mode: false, // Permite pagos pendientes
  };

  console.debug(
    "🚀 ~ createPreference ~ preferenceBody:",
    JSON.stringify(preferenceBody, null, 2),
  );

  // Crear el registro de pago pendiente en nuestra DB
  const transactionAmount = Math.round(plan.valuePromotionalPeriod * 100);

  const payment = await prisma.payments.create({
    data: {
      prospectId,
      mpPreferenceId: null, // Se actualizará cuando MP devuelva el preference ID
      status: "pending",
      transactionAmount,
      currencyId: "MXN",
      description: plan.displayName,
      externalReference: prospectId,
    },
  });

  const response = await preference.create({
    body: preferenceBody,
  });

  // Verificar que la respuesta sea válida
  if (!response || !response.id) {
    console.error(
      "❌ createPreference: Error al crear preferencia - response inválido:",
      response,
    );
    // Eliminar el registro de pago que creamos
    await prisma.payments.delete({
      where: { id: payment.id },
    });
    throw new Error("Error al crear la preferencia de pago en MercadoPago");
  }

  // Actualizar el registro con el preference ID de MP
  await prisma.payments.update({
    where: { id: payment.id },
    data: {
      mpPreferenceId: response.id,
    },
  });

  return {
    preferenceId: response.id,
    initPoint: response.init_point,
    sandboxInitPoint: response.sandbox_init_point,
    paymentId: payment.id,
    amount: plan.valuePromotionalPeriod,
  };
}

export async function getOrCreatePreference(params: CreatePreferenceParams) {
  // Verificar si ya existe un payment pendiente para este prospecto
  const existingPayment = await prisma.payments.findFirst({
    where: {
      prospectId: params.prospectId,
      status: { in: ["pending", "in_process"] },
    },
  });

  // Si existe y está pendiente, devolver el preference existente
  if (existingPayment) {
    // Si el payment existe pero no tiene mpPreferenceId (falló la creación anterior), crear nuevo
    if (!existingPayment.mpPreferenceId) {
      return createPreference(params);
    }

    // Devolver los datos existentes
    return {
      preferenceId: existingPayment.mpPreferenceId,
      paymentId: existingPayment.id,
      amount: existingPayment.transactionAmount || 0,
    };
  }

  // Crear nuevo preference
  return createPreference(params);
}
