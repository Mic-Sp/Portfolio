import { isIP } from "node:net";
import {
  ContactSchema,
  contactFieldErrors,
  sanitizeContactText,
  type ContactPayload,
} from "./schemas/contact.schema.ts";
import { createContactRateLimiter } from "./contact-rate-limit.ts";

const MAX_BYTES = 16 * 1024;
export interface ContactEmail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}
interface ContactEnvironment {
  apiKey?: string;
  from?: string;
  to?: string;
}
interface Dependencies {
  environment: () => ContactEnvironment;
  send: (email: ContactEmail, apiKey: string) => Promise<{ id: string } | null>;
  rateLimit?: ReturnType<typeof createContactRateLimiter>;
  now?: () => number;
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export function formatContactEmail(
  data: ContactPayload,
  env: ContactEnvironment,
  timestamp: string,
): ContactEmail {
  const text = [
    "PORTFOLIO // DIRECT TRANSMISSION",
    `SENDER: ${data.senderName}`,
    `RETURN EMAIL: ${data.senderEmail}`,
    `ORIGIN: ${data.origin}`,
    `TIMESTAMP: ${timestamp}`,
    `SUBJECT: ${data.subject}`,
    "",
    data.message,
  ].join("\n");
  return {
    from: env.from ?? "Portfolio Uplink <onboarding@resend.dev>",
    to: env.to ?? "mic.sprague@gmail.com",
    replyTo: data.senderEmail,
    subject: `[PORTFOLIO // ${data.origin}] ${data.subject} — from ${data.senderName}`,
    text,
    html: `<div style="background:#020617;color:#f1f5f9;padding:28px;font:15px/1.7 monospace"><pre style="font:inherit;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(text)}</pre></div>`,
  };
}
function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
function reject(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return json(
    { status: "REJECTED", error: { code, message, ...extra } },
    status,
    headers,
  );
}

/** Factory isolates provider dispatch so tests never send an actual email. */
export function createContactHandler({
  environment,
  send,
  rateLimit = createContactRateLimiter(),
  now = Date.now,
}: Dependencies) {
  return async function POST(request: Request): Promise<Response> {
    const length = request.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES))
      return reject(
        413,
        "PAYLOAD_TOO_LARGE",
        "Payload exceeds the 16 KB uplink limit.",
      );
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return reject(
        403,
        "ORIGIN_REJECTED",
        "Use the portfolio uplink to transmit a message.",
      );
    const forwarded =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ip = isIP(forwarded) ? forwarded : "unknown";
    const allowance = rateLimit(ip);
    if (!allowance.allowed)
      return reject(
        429,
        "RATE_LIMITED",
        `Uplink rate limit reached. Try again in ${allowance.retryAfter} seconds.`,
        {},
        { "Retry-After": String(allowance.retryAfter) },
      );
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      return reject(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send an application/json payload.",
      );

    // Enforce the real byte count too: Content-Length may be absent or dishonest.
    const reader = request.body?.getReader();
    if (!reader)
      return reject(400, "INVALID_JSON", "A JSON payload is required.");
    let raw = "",
      bytes = 0;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let body: unknown;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_BYTES) {
          await reader.cancel();
          return reject(
            413,
            "PAYLOAD_TOO_LARGE",
            "Payload exceeds the 16 KB uplink limit.",
          );
        }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
      body = JSON.parse(raw);
    } catch {
      return reject(
        400,
        "INVALID_JSON",
        "Payload must contain valid UTF-8 JSON.",
      );
    } finally {
      reader.releaseLock();
    }

    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      // Only the trap may fail. Unknown keys and malformed real fields still get 400.
      if (
        parsed.error.issues.every(
          (issue) => issue.path.length === 1 && issue.path[0] === "website",
        ) &&
        typeof (body as { website?: unknown })?.website === "string" &&
        (body as { website: string }).website.length > 0
      )
        return json({ status: "TRANSMITTED", id: "honeypot-drop" });
      return reject(
        400,
        "VALIDATION_ERROR",
        "Payload failed strict schema validation.",
        {
          fieldErrors: contactFieldErrors(parsed.error),
          formErrors: parsed.error.flatten().formErrors,
        },
      );
    }
    const cleaned = ContactSchema.safeParse({
      ...parsed.data,
      senderName: sanitizeContactText(parsed.data.senderName, false),
      subject: sanitizeContactText(parsed.data.subject, false),
      message: sanitizeContactText(parsed.data.message),
    });
    if (!cleaned.success)
      return reject(
        400,
        "VALIDATION_ERROR",
        "Payload contains no usable text after sanitization.",
        { fieldErrors: contactFieldErrors(cleaned.error) },
      );
    const env = environment();
    if (!env.apiKey)
      return reject(
        503,
        "RELAY_UNAVAILABLE",
        "Email relay is unavailable. Please use direct email.",
      );
    try {
      const delivery = await send(
        formatContactEmail(cleaned.data, env, new Date(now()).toISOString()),
        env.apiKey,
      );
      if (!delivery?.id)
        return reject(
          502,
          "RELAY_ERROR",
          "The relay could not confirm acceptance. Please use direct email.",
        );
      return json({ status: "TRANSMITTED", id: delivery.id });
    } catch {
      // Never echo provider errors, payloads, credentials, or recipient configuration.
      return reject(
        502,
        "RELAY_ERROR",
        "The relay could not confirm acceptance. Please use direct email.",
      );
    }
  };
}
