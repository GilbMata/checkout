import nodemailer from "nodemailer";
console.debug("🚀 ~ process.env.SMTP_USER,:", process.env.SMTP_USER, process.env.SMTP_PASS)

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },

});