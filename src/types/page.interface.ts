import { MenuItemSchema } from "./menu.interface";
import { z } from "zod";
import { SectionPropsSchema } from "./section.interface";

// PageConfiguration schema
export const PageConfigurationSchema = MenuItemSchema.extend({
    sections: z.array(SectionPropsSchema),
  })

export type PageConfiguration = z.infer<typeof PageConfigurationSchema>;