import { transporter } from "./nodemailer";
import { otpTemplate } from "./templates/otp";

export async function sendOtpEmail(
    email: string,
    otp: string,
    magicLink: string
) {

    console.debug("🚀 ~ sendOtpEmail ~ email:", email)
    await transporter.sendMail({
        from: `"Station 24" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Tu acceso a Station 24 🔥",
        html: otpTemplate(otp, magicLink),
    });
}