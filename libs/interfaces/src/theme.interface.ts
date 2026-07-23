import { z } from "zod";
import { UrlOrPathSchema } from "./url.interface.js";
import { BreakpointSchema } from "./layout.interface.js";
import { BASE_LOCALE, I18nLocaleSchema } from "./i18n.interface.js";

// ThemeConfig schema
export const ThemeConfigSchema = z.object({
  themeName: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  tertiaryColor: z.string().optional(),
  tertiaryHoverColor: z.string().optional(),
  surfaceColor: z.string().optional(),
  linkColor: z.string(),
  linkHoverColor: z.string(),
  textColor: z.string().optional(),
  backgroundColor: z.string(),
  menuBackgroundColor: z.string(),
  menuTextColor: z.string().optional(),
  menuHoverColor: z.string(),
});

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;


// SiteThemeConfig schema
export const SiteThemeConfigSchema = z.object({
  siteName: z.string(),
  logoUrl: UrlOrPathSchema.optional(),
  faviconUrl: UrlOrPathSchema.optional(),
  containerMaxWidth: z.union([BreakpointSchema, z.literal(false)]).optional(),
  // Set once at setup; deliberately no in-app control to change it (config text is written in this language).
  defaultLanguage: I18nLocaleSchema.default(BASE_LOCALE),
});

export type SiteThemeConfig = z.infer<typeof SiteThemeConfigSchema>;
