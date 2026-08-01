import { z } from 'zod';
import type { I18nEntry } from './sections/section.interface.js';

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

/** Translation key of the contact-page presentation text. */
export const CONTACT_PRESENTATION_KEY = 'contact.presentation';

/**
 * Contact page settings — stored in their own blob (key `contact`), managed
 * from /manage/contact. Like the team there is no draft/publish lifecycle:
 * admin saves go live immediately.
 */
export const ContactConfigSchema = z.object({
  /**
   * Optional presentation (markdown), shown above the contact form. A
   * translation DEFAULT: per-language values are managed on the Translations
   * page under {@link CONTACT_PRESENTATION_KEY}.
   */
  presentation: z.string().optional(),
});

export type ContactConfig = z.infer<typeof ContactConfigSchema>;

/**
 * Translatable (key → default value) pairs the contact blob references, merged
 * into the Translations editor's expected keys alongside `collectI18nEntries`
 * (the contact settings live in their own blob, so the config walk cannot see them).
 */
export const collectContactI18nEntries = (contact: ContactConfig): I18nEntry[] => {
  const entries: I18nEntry[] = [];
  if (contact.presentation?.trim()) {
    entries.push({ key: CONTACT_PRESENTATION_KEY, defaultValue: contact.presentation });
  }
  return entries;
};
