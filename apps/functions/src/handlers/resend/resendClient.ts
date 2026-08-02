import { ErrorResponses } from '../../errors/error';
import type { ContactRequest } from '@simple-site/interfaces';

/** Resend send-email endpoint (server → Resend, authenticated with the API key). */
export const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

/** Resend rejects requests without a User-Agent header (403). */
const USER_AGENT = 'simple-site-contact';

/**
 * Upper bound on the Resend call — well under Netlify's ~10s synchronous
 * function limit, so a provider stall still returns the JSON error envelope
 * instead of a raw platform 502.
 */
const RESEND_TIMEOUT_MS = 5000;

export interface ResendEnv {
  apiKey: string;
  /** Verified Resend sender the notification is sent AS (not the visitor's address). */
  fromEmail: string;
  /** Site owner's inbox the contact messages are delivered to. */
  toEmail: string;
}

/**
 * Reads the Resend credentials + contact addresses from the function environment.
 * The caller is anonymous, so the error is generic — WHICH variables are missing
 * is logged server-side only, never sent to the client (unlike the admin-gated
 * ImageKit client, whose detailed configuration errors are safe to return).
 * @throws ApiErrorResponse (500 INTERNAL_ERROR) when values are missing.
 */
export const getResendEnv = (path?: string): ResendEnv => {
  const apiKey = Netlify.env.get('RESEND_API_KEY');
  const fromEmail = Netlify.env.get('CONTACT_FROM_EMAIL');
  const toEmail = Netlify.env.get('CONTACT_TO_EMAIL');

  if (!apiKey || !fromEmail || !toEmail) {
    const missing = [!apiKey && 'RESEND_API_KEY', !fromEmail && 'CONTACT_FROM_EMAIL', !toEmail && 'CONTACT_TO_EMAIL'].filter(Boolean);
    console.error('Contact email is not configured; missing:', missing.join(', '));
    throw ErrorResponses.internalError('Failed to send the message', path);
  }

  return { apiKey, fromEmail, toEmail };
};

/**
 * Relays a contact message to the site owner via the Resend API. The visitor's
 * address goes in `reply_to` — Resend only sends from verified domains, so it
 * can never be the `from` — and the body is sent as plain text so user content
 * is never interpreted as markup.
 * @throws ApiErrorResponse (500 INTERNAL_ERROR) when Resend refuses or stalls.
 */
export const sendContactEmail = async (contact: ContactRequest, env: ResendEnv, path?: string): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.apiKey}`,
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        from: env.fromEmail,
        to: [env.toEmail],
        reply_to: contact.email,
        subject: `New contact message from ${contact.email}`,
        text: contact.message,
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
  } catch (error) {
    // Timeout or network failure — same generic envelope as a refusal.
    console.error('Resend request failed:', error);
    throw ErrorResponses.internalError('Failed to send the message', path);
  }

  if (!response.ok) {
    // Never surface the provider's response to the anonymous caller.
    console.error('Resend send failed:', response.status, await response.text());
    throw ErrorResponses.internalError('Failed to send the message', path);
  }
};
