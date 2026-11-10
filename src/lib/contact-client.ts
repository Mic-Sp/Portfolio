import {
  ContactSchema,
  contactFieldErrors,
  type ContactFieldErrors,
  type ContactInput,
} from "./schemas/contact.schema.ts";

export type ContactResult =
  | { ok: true; id: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: ContactFieldErrors;
      code: string;
    };

/** No persistence, analytics, logging, or automatic retries of private messages. */
export async function transmitContact(
  input: ContactInput,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<ContactResult> {
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Check the highlighted payload fields.",
      fieldErrors: contactFieldErrors(parsed.error),
    };
  try {
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000);
    const response = await (options.fetcher ?? fetch)("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal,
      credentials: "same-origin",
    });
    const body = await response.json();
    if (
      response.ok &&
      body.status === "TRANSMITTED" &&
      typeof body.id === "string"
    )
      return { ok: true, id: body.id };
    return {
      ok: false,
      code: body.error?.code ?? "RELAY_ERROR",
      message:
        body.error?.message ??
        "Transmission could not be confirmed. Please use direct email.",
      fieldErrors: body.error?.fieldErrors,
    };
  } catch {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: options.signal?.aborted
        ? "Request cancelled. A transmission already accepted by the relay cannot be recalled."
        : "Transmission unconfirmed. Check your connection or use direct email; avoid resending if the relay may have accepted it.",
    };
  }
}
