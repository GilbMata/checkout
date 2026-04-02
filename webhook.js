const { spawn } = require("child_process");
const http = require("http");

const WEBHOOK_SECRET = "tu_secret_aqui";
const PORT = 9000;

const server = http.createServer((req, res) => {
  if (req.url === "/deploy" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      console.log("Received webhook, running deploy...");

      const deploy = spawn("bash", ["/var/www/station/deploy.sh"], {
        cwd: "/var/www/station",
        env: process.env,
      });

      deploy.stdout.on("data", (data) => console.log(data.toString()));
      deploy.stderr.on("data", (data) => console.error(data.toString()));
      deploy.on("close", (code) => {
        console.log(`Deploy script finished with code ${code}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      });
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Webhook listener running on port ${PORT}`);
});
