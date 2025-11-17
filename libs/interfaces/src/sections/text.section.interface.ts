import { z } from "zod";
import { BaseSectionDesignSchema, BaseSectionPropsSchema, SectionTypesEnum } from "./section.interface.js";
import { UrlOrPathSchema } from "../url.interface.js";
import { BreakpointSchema, VerticalAlignSchema, HorizontalAlignSchema, MediaPositionSchema } from "../layout.interface.js";

// Text section schemas
// Column schemas for multi-column layouts
const TextColumnContentSchema = z.object({
    title: z.string().optional(),
    paragraph: z.string().optional(),
  });

export type TextColumnContent = z.infer<typeof TextColumnContentSchema>;

// Media schema for column images/backgrounds
const MediaSchema = z.object({
  url: UrlOrPathSchema,
  position: MediaPositionSchema.optional(), // 'cover' or 'contain', defaults to 'contain'
  verticalAlign: VerticalAlignSchema.optional(), // 'top', 'middle', 'bottom', 'stretch'
  horizontalAlign: HorizontalAlignSchema.optional(), // 'left', 'center', 'right', 'span'
  maxWidth: z.string().optional(), // e.g., "120px", "50%"
  maxHeight: z.string().optional(), // e.g., "200px", "10rem"
});

export type Media = z.infer<typeof MediaSchema>;
  
const TextColumnDesignSchema = z.object({
    hideOnBreakpoints: z.array(BreakpointSchema).optional(),
    textHorizontalAlign: HorizontalAlignSchema.optional(), // Horizontal text alignment
    textVerticalAlign: VerticalAlignSchema.optional(), // Vertical text alignment
    media: MediaSchema.optional(), // Media (image/background) configuration
  });

export type TextColumnDesign = z.infer<typeof TextColumnDesignSchema>;

  // Text content schema
const TextContentSchema = z.object({
    columns: z.array(TextColumnContentSchema).min(1).max(4),
  });
  
export type TextContent = z.infer<typeof TextContentSchema>;
  
const TextDesignSchema = BaseSectionDesignSchema.extend({  
    // Multi-column layout support
    columnLayout: z.array(z.number().positive()).min(2).max(4).optional(),
    columnConfig: z.array(TextColumnDesignSchema).optional(),
    
    // Section-level background image (separate from legacy imageUrl)
    backgroundUrl: UrlOrPathSchema.optional(),
    parallax: z.boolean().optional(),
  });
  
export type TextDesign = z.infer<typeof TextDesignSchema>;
  
export const TextSectionPropsSchema = BaseSectionPropsSchema.extend({
    type: z.literal(SectionTypesEnum.TEXT),
    content: TextContentSchema,
    design: TextDesignSchema.optional(),
  });
  
export type TextSectionProps = z.infer<typeof TextSectionPropsSchema>;
