import { z } from "zod";

/**
 * Media management interfaces for the ImageKit integration.
 *
 * Uploads use the ImageKit Upload File V2 API (browser → ImageKit direct),
 * authorized by a short-lived JWT minted server-side. Browse/delete are
 * proxied through an authenticated Netlify function using the Management API.
 */

/** A media asset as surfaced to the admin UI (subset of the ImageKit file object). */
export const MediaFileSchema = z.object({
  fileId: z.string(),
  name: z.string(),
  filePath: z.string(),
  url: z.string(),
  /** ImageKit-generated thumbnail URL (images and videos). */
  thumbnail: z.string().optional(),
  /** ImageKit classifies as "image" | "non-image"; use `mime` to detect video. */
  fileType: z.string().optional(),
  mime: z.string().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  size: z.number().optional(),
  createdAt: z.string().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export type MediaFile = z.infer<typeof MediaFileSchema>;

export const MediaListResponseSchema = z.array(MediaFileSchema);
export type MediaListResponse = z.infer<typeof MediaListResponseSchema>;

/** UI/query media type filter. */
export const MediaTypeSchema = z.enum(["all", "image", "video"]);
export type MediaType = z.infer<typeof MediaTypeSchema>;

/** Client → upload-auth function: what the caller wants to upload. */
export const UploadAuthRequestSchema = z.object({
  fileName: z.string().min(1),
  tags: z.array(z.string()).optional(),
});
export type UploadAuthRequest = z.infer<typeof UploadAuthRequestSchema>;

/**
 * Canonical upload parameters the server signs into the JWT. The client MUST
 * echo these verbatim as multipart fields (V2 verifies the whole payload), so
 * every value is a string to guarantee a byte-for-byte match with the token.
 */
export const UploadPayloadSchema = z.object({
  fileName: z.string(),
  folder: z.string(),
  useUniqueFileName: z.string(),
  tags: z.string().optional(),
});
export type UploadPayload = z.infer<typeof UploadPayloadSchema>;

/** upload-auth function → client: the signed token plus the exact payload to send. */
export const UploadAuthResponseSchema = z.object({
  token: z.string(),
  expire: z.number(),
  publicKey: z.string(),
  uploadPayload: UploadPayloadSchema,
});
export type UploadAuthResponse = z.infer<typeof UploadAuthResponseSchema>;
