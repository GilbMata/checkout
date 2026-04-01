import { generateOTP } from "@/lib/auth/otp";

interface PlaticaMessageRequest {
  channelId: string;
  conversationId: string;
  template: {
    name: string;
    params: string[];
    buttons?: {
      index: number;
      sub_type: string;
      parameters: { type: string; text: string }[];
    }[];
  };
}

export async function sendOTPWhatsApp(
  phone: string,
  otp: string,
): Promise<boolean> {
  const channelId = process.env.PLATICA_CHANNEL_ID;
  const apiKey = process.env.PLATICA_API_KEY;
  const apiUrl = process.env.PLATICA_API_URL;

  if (!channelId || !apiKey || !apiUrl) {
    console.error("Platica credentials not configured");
    return false;
  }

  const cleanPhone = phone.replace(/\D/g, "");

  const body: PlaticaMessageRequest = {
    channelId,
    conversationId: cleanPhone,
    template: {
      name: "verificacion_no_borrar",
      params: [otp],
      buttons: [
        {
          index: 0,
          sub_type: "url",
          parameters: [{ type: "text", text: otp }],
        },
      ],
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Platica API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp OTP:", error);
    return false;
  }
}

export { generateOTP };
