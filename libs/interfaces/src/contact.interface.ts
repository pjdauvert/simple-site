import { z } from 'zod';

/** Maximum length of a contact message — enforced by the form and the API alike. */
export const CONTACT_MESSAGE_MAX_LENGTH = 1000;

// The public contact form payload: the visitor's reply address and their
// message. Shared by the web form (client-side validation) and the contact
// function (authoritative validation), so the two can never drift.
export const ContactRequestSchema = z.object({
  email: z.email(),
  message: z.string().trim().min(1).max(CONTACT_MESSAGE_MAX_LENGTH),
});

export type ContactRequest = z.infer<typeof ContactRequestSchema>;

export const ContactResponseSchema = z.object({
  message: z.string(),
});

export type ContactResponse = z.infer<typeof ContactResponseSchema>;
