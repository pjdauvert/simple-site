import { z } from 'zod';

export const UserSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;

export const UsersResponseSchema = z.array(UserSchema);
export type UsersResponse = z.infer<typeof UsersResponseSchema>;
