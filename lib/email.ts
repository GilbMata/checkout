import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Station" <noreply@station.com>',
      to: email,
      subject: 'Código de verificación - Station',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Código de verificación</h2>
          <p>Tu código de verificación es:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px;">Este código expira en 5 minutos.</p>
          <p style="color: #999; font-size: 12px;">Si no solicitaste este código, ignora este correo.</p>
        </div>
      `,
    })
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

export { generateOTP }
