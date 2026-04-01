export function otpTemplate(otp: string, magicLink: string) {
    return `
    <div style="background:#0f0f0f;padding:30px;font-family:Arial;color:#fff;text-align:center">
      
      <h1 style="color:#ff5a00">Station 24 Fitness 🔥</h1>

      <p>Tu código de acceso:</p>

      <h2 style="font-size:32px;letter-spacing:5px">${otp}</h2>

      <p>O entra directamente:</p>

      <a href="${magicLink}" 
         style="background:#ff5a00;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
         Acceder
      </a>

      <p style="margin-top:20px;font-size:12px">
        Este código expira en 5 minutos
      </p>
    </div>
  `;
}