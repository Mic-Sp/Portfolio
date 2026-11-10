import { z } from "zod";

export const ContactSchema = z
  .object({
    senderName: z.string().trim().min(2).max(80).default("CLI_OPERATOR"),
    senderEmail: z.string().trim().email().max(120),
    subject: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .default("Portfolio Telemetry Uplink"),
    message: z
      .string()
      .trim()
      .min(10, "Message must be at least 10 characters")
      .max(2000),
    origin: z.enum(["DOSSIER_GUI", "CLI_TERMINAL"]),
    website: z.string().max(0).optional(),
  })
  .strict();

export type ContactInput = z.input<typeof ContactSchema>;
export type ContactPayload = z.output<typeof ContactSchema>;
export type ContactFieldErrors = Partial<Record<keyof ContactInput, string[]>>;

/** Display cleanup only. HTML output must still be escaped at its insertion point. */
export function sanitizeContactText(input: string, multiline = true): string {
  return (
    input
      .replace(/<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\r\n?/g, "\n")
      // Keep message newlines, but remove C0/C1 and bidi formatting controls.
      .replace(
        /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,
        "",
      )
      .replace(multiline ? /\r/g : /[\r\n]/g, " ")
      .trim()
  );
}

export function contactFieldErrors(error: z.ZodError): ContactFieldErrors {
  return error.flatten().fieldErrors as ContactFieldErrors;
}
