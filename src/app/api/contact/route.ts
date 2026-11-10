import { Resend } from "resend";
import { createContactHandler } from "@/lib/contact-handler";

export const POST = createContactHandler({
  environment: () => ({
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.CONTACT_FROM_EMAIL,
    to: process.env.CONTACT_TO_EMAIL,
  }),
  send: async (email, apiKey) => {
    const { data, error } = await new Resend(apiKey).emails.send(email, {
      signal: AbortSignal.timeout(10000),
    });
    return error ? null : data;
  },
});
