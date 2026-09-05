import assert from "node:assert/strict";
import { CampaignRequest } from "./batch_campaign.js";

const accepted = CampaignRequest.safeParse({ campaign_id: "build-42", recipients: ["+15551234567"], message: "Build 42 passed" });
assert.equal(accepted.success, true);
const rejected = CampaignRequest.safeParse({ campaign_id: "build-42", recipients: [], message: "" });
assert.equal(rejected.success, false);
console.log("campaign boundary test passed");
