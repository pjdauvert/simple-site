import { z } from "zod";

/**
 * Media management interfaces for the ImageKit integration.
 *
 * Uploads use the ImageKit Upload File V2 API (browser → ImageKit direct),
 * authorized by a short-lived JWT minted server-side. Browse/delete and folder
 * operations are proxied through an authenticated Netlify function using the
 * Management API. All paths are relative to a server-side root directory
 * (`IMAGEKIT_ROOT_DIR`); the browser never sees the absolute ImageKit path.
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

/** A folder as surfaced to the admin UI. `path` is relative to the root directory. */
export const MediaFolderSchema = z.object({
  folderId: z.string(),
  name: z.string(),
  /** Path relative to IMAGEKIT_ROOT_DIR, e.g. "/products". */
  path: z.string(),
});
export type MediaFolder = z.infer<typeof MediaFolderSchema>;

/** Result of listing a folder: its sub-folders and its files. */
export const MediaListResultSchema = z.object({
  folders: z.array(MediaFolderSchema),
  files: z.array(MediaFileSchema),
});
export type MediaListResult = z.infer<typeof MediaListResultSchema>;

/** UI/query media type filter (applies to files; folders are always shown). */
export const MediaTypeSchema = z.enum(["all", "image", "video"]);
export type MediaType = z.infer<typeof MediaTypeSchema>;

/** Client → upload-auth function: what the caller wants to upload, and where. */
export const UploadAuthRequestSchema = z.object({
  fileName: z.string().min(1),
  /** Target folder relative to the root directory (default: root). */
  path: z.string().optional(),
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

/** Client → create-folder: a new folder `name` inside parent `path` (relative to root). */
export const CreateFolderRequestSchema = z.object({
  name: z.string().min(1),
  path: z.string().optional(),
});
export type CreateFolderRequest = z.infer<typeof CreateFolderRequestSchema>;
