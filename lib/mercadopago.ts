import MercadoPagoConfig from "mercadopago";

const isProd = process.env.MP_ENV === "prod";

export const mp = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
});

export const mpConfig = {
    isProd,
};