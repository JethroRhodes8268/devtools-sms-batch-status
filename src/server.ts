import { createServer } from "node:http";
import { sendDeveloperToolsCampaign, CampaignRequest } from "./batch_campaign.js";
import { InfraiError } from "./infrai.js";

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/campaigns/devtools") { res.writeHead(404); res.end("Not found"); return; }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = CampaignRequest.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const deliveries = await sendDeveloperToolsCampaign(body);
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, data: { deliveries } }));
  } catch (error) {
    const status = error instanceof InfraiError && error.status >= 400 && error.status < 500 ? error.status : error instanceof Error && error.name === "ZodError" ? 400 : 502;
    res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, error: { message: error instanceof Error ? error.message : "Request failed" } }));
  }
});
server.listen(Number(process.env.PORT ?? 3000), () => console.log("devtools campaign service listening"));
