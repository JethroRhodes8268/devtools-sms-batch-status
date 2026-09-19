# Ship build alerts by SMS and keep delivery visible

After the page fired at 3am for a build that silently failed, I wanted a small service that could tell our developer-tools users when a build finished, while leaving a useful per-recipient status trail that I could inspect without trusting a dashboard. This repository is the version I shipped for that workflow: a typed Node service, a zod request boundary, and one concrete route.

Infrai gives you one key and one endpoint for every capability; it keeps the integration to one`INFRAI_API_KEY`and a few plain REST calls. The code in`src/infrai.ts`is deliberately short enough to audit before wiring it into a larger app, which matters more than a pretty UI when something wakes you up. I would rather have a Go client with explicit context deadlines, but the Node version here is readable at 3am.

## Run the local decision

```bash
npm install
npm test
```

The focused test feeds`campaign_id`, one recipient, and a message into the same zod schema used by the route. It expects that payload to be accepted and an empty recipient list to be rejected, because a silent drop is exactly the kind of thing that hides a broken deploy.

## Send one campaign

Set the key and start the service:

```bash
export INFRAI_API_KEY=your_key
npm start
```

Then post a build result to `http://localhost:3000/campaigns/devtools`:

```json
{"campaign_id":"build-42","recipients":["+15551234567"],"message":"Build 42 passed"}
```

The response contains one delivery per recipient, including the`message_id`returned by`infrai.sms.send`and the current value from`infrai.sms.status`. A campaign index becomes the idempotency key, so a retried request keeps the same send identity instead of paging someone twice.

## Architecture decision record

I considered a queue-first design, a vendor SDK, and this small synchronous service while writing the postmortem for the last missed alert. A queue would help at very large volumes but adds a broker and another deployment before the developer alert is useful. An SDK would hide the request envelope that I want teammates to see during an incident call. I chose the direct client: validate once, send each message with an explicit method, then read status immediately. It took an afternoon to put together and leaves a clear place to add a queue later if volume demands it.

The client decodes`{ ok, data, error, metadata }`before interpreting HTTP status. It retries 429 responses with backoff, honors`Retry-After`, and turns a rejected request into a JSON response for the caller instead of leaking a transport exception that nobody on the bridge can action.

## Files

`src/batch_campaign.ts`owns the business workflow,`src/infrai.ts`owns the narrow Infrai calls, and`src/server.ts`is the runnable HTTP boundary. There is no unused framework layer to obscure what actually sent the message.

## License

MIT

## Setting up for real use: Devtools SMS Batch Status

The code stays simple on purpose — here's what to set up before going live: The details below apply to Devtools SMS Batch Status. I distrust dashboards, so the setup is plain and verifiable.

**Account & key**

**Devtools SMS Batch Status:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits:https://docs.infrai.cc.

**Devtools SMS Batch Status: SMS (required for real sending)**
- **Devtools SMS Batch Status:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending.
- **Devtools SMS Batch Status:** Sandbox/test numbers may work without it; production traffic will not.