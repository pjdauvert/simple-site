import { z } from "zod";

// MenuItem schema
export const MenuItemSchema = z.object({
  menuTitle: z.string(),
  pageName: z.string(),
  route: z.string(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuConfigSchema = z.object({
  items: z.array(MenuItemSchema),
});

export type MenuConfig = z.infer<typeof MenuConfigSchema>;

