import { z } from "zod";
import { infrai } from "./infrai.js";

export const CampaignRequest = z.object({ campaign_id: z.string().min(1), recipients: z.array(z.string().min(1)).min(1), message: z.string().min(1).max(160) });
export type CampaignRequest = z.infer<typeof CampaignRequest>;
export type Delivery = { to: string; message_id: string; status: string };

export async function sendDeveloperToolsCampaign(input: CampaignRequest): Promise<Delivery[]> {
  const request = CampaignRequest.parse(input);
  const deliveries: Delivery[] = [];
  for (const [index, to] of request.recipients.entries()) {
    const sent = await infrai.sms.send({ to, body: request.message }, `${request.campaign_id}:${index}`);
    const status = await infrai.sms.status(sent.message_id);
    deliveries.push({ to, message_id: sent.message_id, status: status.status });
  }
  return deliveries;
}
