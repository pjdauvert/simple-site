import { z } from "zod";
import { UrlOrPathSchema } from "./url.interface.js";
import { BreakpointSchema } from "./layout.interface.js";

// ThemeConfig schema
export const ThemeConfigSchema = z.object({
  themeName: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  linkColor: z.string(),
  linkHoverColor: z.string(),
  backgroundColor: z.string(),
  menuBackgroundColor: z.string(),
  menuHoverColor: z.string(),
});

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;


// SiteThemeConfig schema
export const SiteThemeConfigSchema = z.object({
  siteName: z.string(),
  logoUrl: UrlOrPathSchema.optional(),
  faviconUrl: UrlOrPathSchema.optional(),
  containerMaxWidth: z.union([BreakpointSchema, z.literal(false)]).optional(),
});

export type SiteThemeConfig = z.infer<typeof SiteThemeConfigSchema>;
