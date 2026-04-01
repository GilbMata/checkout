import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");

        if (!email) {
            return Response.json(
                { error: "Email es requerido" },
                { status: 400 }
            );
        }

        const AUTH_BASE64 = Buffer.from(
            `${process.env.EVO_USER}:${process.env.EVO_PASS}`
        ).toString("base64");

        const url = process.env.EVO_API_URL + `/api/v2/members?email=${encodeURIComponent(
            email
        )}` + '&take=50&skip=0&onlyPersonal=false&showActivityData=false&showMemberships=false&showsResponsibles=false'

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Basic ${AUTH_BASE64}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            const text = await response.text();
            return Response.json(
                { error: "Error en API externa", detail: text },
                { status: response.status }
            );
        }
        if (response.status === 401) {
            console.error("🔐 Credenciales incorrectas");
        }

        const data = await response.json();

        return Response.json(data);
    } catch (error) {
        console.error("ERROR EVO API:", error);

        return Response.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}