import https from "https";

export function evoRequest(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
  auth?: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const bodyString = body ? JSON.stringify(body) : undefined;

    const req = https.request(
      {
        hostname: "evo-integracao-api.w12app.com.br",
        path,
        method,
        headers: {
          accept: "application/json",
          authorization: `Basic ${auth}`,
          "content-type": "application/json-patch+json",
          culture: "pt-BR",
          ...(bodyString && {
            "content-length": Buffer.byteLength(bodyString),
          }),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            const parsed = data.includes("{")
              ? JSON.parse(data)
              : { raw: data };
            reject(
              Object.assign(new Error(`EVO error ${res.statusCode}`), {
                status: res.statusCode,
                response: parsed,
              }),
            );
          } else {
            resolve(data ? JSON.parse(data) : null);
          }
        });
      },
    );

    req.on("error", reject);
    if (bodyString) req.write(bodyString);
    req.end();
  });
}
