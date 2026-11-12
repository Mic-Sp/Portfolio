"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Radio, ShieldCheck } from "lucide-react";
import {
  ContactSchema,
  contactFieldErrors,
  type ContactFieldErrors,
  type ContactInput,
} from "@/lib/schemas/contact.schema";
import { transmitContact } from "@/lib/contact-client";
import { PROFILE_CONFIG } from "@/data/profile.config";
import "./contact-transmission.css";

export function ContactTransmission({ prefix }: { prefix: string }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload: ContactInput = {
      senderName: String(values.get("senderName") ?? ""),
      senderEmail: String(values.get("senderEmail") ?? ""),
      message: String(values.get("message") ?? ""),
      website: String(values.get("website") ?? ""),
      origin: "DOSSIER_GUI",
    };
    const parsed = ContactSchema.safeParse(payload);
    if (!parsed.success) {
      const fields = contactFieldErrors(parsed.error);
      setErrors(fields);
      setStatus("error");
      setFeedback("VALIDATION REJECTED // Check the highlighted fields.");
      form
        .querySelector<HTMLElement>(`[name="${Object.keys(fields)[0]}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    locked.current = true;
    const controller = new AbortController();
    request.current = controller;
    setErrors({});
    setStatus("pending");
    setFeedback("ENCRYPTING & VALIDATING…");
    try {
      const result = await transmitContact(parsed.data, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (result.ok) {
        setStatus("success");
        setFeedback("200 OK // TRANSMISSION CONFIRMED");
        setMessage("");
        form.reset();
      } else {
        setStatus("error");
        setErrors(result.fieldErrors ?? {});
        setFeedback(`${result.code} // ${result.message}`);
      }
    } finally {
      locked.current = false;
    }
  }

  function errorFor(field: keyof ContactFieldErrors) {
    return errors[field]?.length ? (
      <span className="contact-field-error" id={`${prefix}-${field}-error`}>
        {errors[field]?.join(" ")}
      </span>
    ) : null;
  }
  return (
    <section
      className="contact-transmission"
      data-dossier-anchor="contact"
      aria-labelledby={`${prefix}-transmission`}
    >
      <header>
        <p className="contact-transmission-label" id={`${prefix}-transmission`}>
          <Radio size={17} aria-hidden="true" /> DIRECT TRANSMISSION
        </p>
        <span>POST /api/contact // ZOD GUARDED</span>
      </header>
      <form onSubmit={submit} noValidate aria-busy={status === "pending"}>
        <fieldset disabled={status === "pending"}>
          <legend className="sr-only">Send a message to Michael Sprague</legend>
          <div className="contact-fields-row">
            <div className="contact-field">
              <label htmlFor={`${prefix}-senderName`}>NAME</label>
              <input
                id={`${prefix}-senderName`}
                name="senderName"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                aria-invalid={!!errors.senderName}
                aria-describedby={
                  errors.senderName ? `${prefix}-senderName-error` : undefined
                }
                placeholder="Your name"
              />
              {errorFor("senderName")}
            </div>
            <div className="contact-field">
              <label htmlFor={`${prefix}-senderEmail`}>RETURN EMAIL</label>
              <input
                id={`${prefix}-senderEmail`}
                name="senderEmail"
                type="email"
                autoComplete="email"
                required
                maxLength={120}
                aria-invalid={!!errors.senderEmail}
                aria-describedby={
                  errors.senderEmail ? `${prefix}-senderEmail-error` : undefined
                }
                placeholder="you@company.com"
              />
              {errorFor("senderEmail")}
            </div>
          </div>
          <div className="contact-field">
            <div className="contact-message-label">
              <label htmlFor={`${prefix}-message`}>MESSAGE</label>
              <span id={`${prefix}-message-count`} aria-live="off">
                {message.length} / 2000
              </span>
            </div>
            <textarea
              id={`${prefix}-message`}
              name="message"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={!!errors.message}
              aria-describedby={`${prefix}-message-count${errors.message ? ` ${prefix}-message-error` : ""}`}
              placeholder="A role, a project, or an idea worth building. Start the conversation."
            />
            {errorFor("message")}
          </div>
          <div className="contact-honeypot" aria-hidden="true">
            <label htmlFor={`${prefix}-website`}>Website</label>
            <input
              id={`${prefix}-website`}
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
          </div>
          <div className="contact-submit-row">
            <button type="submit" disabled={status === "pending"}>
              {status === "pending"
                ? "ENCRYPTING & VALIDATING…"
                : "TRANSMIT PAYLOAD"}{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            <span className="contact-security">
              <ShieldCheck size={15} aria-hidden="true" />
              {"ZOD .strict() SCHEMA // RATE-LIMITED // RESEND TLS"}
            </span>
          </div>
        </fieldset>
        <p
          className="contact-feedback"
          data-status={status}
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {feedback || "IDLE // Direct channel ready."}
        </p>
        {status === "success" && (
          <p className="contact-note">
            Accepted by the email relay for delivery. Thank you for reaching
            out.
          </p>
        )}
        <p className="contact-note">
          Prefer your email client?{" "}
          <a href={PROFILE_CONFIG.commsAndTelemetry.directChannels.email.href}>
            Send a direct email ↗
          </a>
        </p>
      </form>
    </section>
  );
}
