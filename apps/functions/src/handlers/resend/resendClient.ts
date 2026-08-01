import { ErrorResponses } from '../../errors/error';
import type { ContactRequest } from '@simple-site/interfaces';

/** Resend send-email endpoint (server → Resend, authenticated with the API key). */
export const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

/** Resend rejects requests without a User-Agent header (403). */
const USER_AGENT = 'simple-site-contact';

export interface ResendEnv {
  apiKey: string;
  /** Verified Resend sender the notification is sent AS (not the visitor's address). */
  fromEmail: string;
  /** Site owner's inbox the contact messages are delivered to. */
  toEmail: string;
}

/**
 * Reads the Resend credentials + contact addresses from the function environment.
 * @throws ApiErrorResponse (500 CONFIGURATION_ERROR) when values are missing.
 */
export const getResendEnv = (path?: string): ResendEnv => {
  const apiKey = Netlify.env.get('RESEND_API_KEY');
  const fromEmail = Netlify.env.get('CONTACT_FROM_EMAIL');
  const toEmail = Netlify.env.get('CONTACT_TO_EMAIL');

  if (!apiKey || !fromEmail || !toEmail) {
    throw ErrorResponses.configurationError(
      'Contact email is not configured',
      { missing: [!apiKey && 'RESEND_API_KEY', !fromEmail && 'CONTACT_FROM_EMAIL', !toEmail && 'CONTACT_TO_EMAIL'].filter(Boolean) },
      path,
    );
  }

  return { apiKey, fromEmail, toEmail };
};

/**
 * Relays a contact message to the site owner via the Resend API. The visitor's
 * address goes in `reply_to` — Resend only sends from verified domains, so it
 * can never be the `from` — and the body is sent as plain text so user content
 * is never interpreted as markup.
 * @throws ApiErrorResponse (500 INTERNAL_ERROR) when Resend refuses the send.
 */
export const sendContactEmail = async (contact: ContactRequest, env: ResendEnv, path?: string): Promise<void> => {
  const response = await fetch(RESEND_EMAILS_URL, {
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
  });

  if (!response.ok) {
    // Never surface the provider's response to the anonymous caller.
    console.error('Resend send failed:', response.status, await response.text());
    throw ErrorResponses.internalError('Failed to send the message', path);
  }
};
