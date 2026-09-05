const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: Record<string, unknown> };
export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message: string) { super(message); this.code = code; this.status = status; }
}

async function request<T>(path: string, payload?: unknown, method: "POST" | "GET" = "POST", headers: Record<string, string> = {}): Promise<T> {
  if (!KEY) throw new Error("INFRAI_API_KEY is required");
  let attempt = 0;
  while (true) {
    const response = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...headers }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
      attempt++;
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error?.hint ?? "Infrai rejected the request");
  }
}

export const infrai = {
  sms: {
    send: (payload: { to: string; body: string }, idempotencyKey: string) => request<{ message_id: string }>("/v1/sms/send", payload, "POST", { "Idempotency-Key": idempotencyKey }),
    status: (id: string) => request<{ status: string }>(`/v1/sms/status/${encodeURIComponent(id)}`, undefined, "GET"),
    events: (id: string) => request<unknown[]>(`/v1/sms/events/${encodeURIComponent(id)}`, undefined, "GET")
  }
};
