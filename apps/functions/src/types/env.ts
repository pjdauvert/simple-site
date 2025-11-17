import { z } from 'zod';

export const ServerEnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MAILGUN_API_KEY: z.string().min(1),
  MAILGUN_DOMAIN: z.string().min(1),
  MAILGUN_TO_EMAIL: z.email(),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1),
  IMAGEKIT_PUBLIC_KEY: z.string().min(1),
  IMAGEKIT_URL_ENDPOINT: z.url(),
  GOOGLE_API_KEY_SERVER: z.string().min(1),
  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_CLIENT_SECRET: z.string().min(1),
  AUTH0_REDIRECT_URI: z.url(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export const getServerEnv = (): ServerEnv => {
  return ServerEnvSchema.parse(process.env);
};
