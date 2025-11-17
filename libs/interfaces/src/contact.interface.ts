import { z } from 'zod';

export const ContactRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  message: z.string().min(1).max(5000),
});

export type ContactRequest = z.infer<typeof ContactRequestSchema>;

export const ContactResponseSchema = z.object({
  ok: z.boolean(),
});

export type ContactResponse = z.infer<typeof ContactResponseSchema>;
