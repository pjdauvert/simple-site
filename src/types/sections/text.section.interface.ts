import { z } from "zod";
import { BaseSectionDesignSchema, BaseSectionPropsSchema, SectionTypesEnum } from "./section.interface";
import { UrlOrPathSchema } from "../url.interface";
import { BreakpointSchema, SectionImageSizeSchema, SectionImagePositionSchema, ColumnVerticalAlignSchema, TextAlignSchema } from "../layout.interface";

// Text section schemas
// Column schemas for multi-column layouts
const TextColumnContentSchema = z.object({
    title: z.string().optional(),
    paragraph: z.string().optional(),
  });

export type TextColumnContent = z.infer<typeof TextColumnContentSchema>;
  
const TextColumnDesignSchema = z.object({
    hideOnBreakpoints: z.array(BreakpointSchema).optional(),
    verticalAlign: ColumnVerticalAlignSchema.optional(),
    textAlign: TextAlignSchema.optional(),
    imageUrl: UrlOrPathSchema.optional(),
    imageSize: SectionImageSizeSchema.optional(),
    imagePosition: SectionImagePositionSchema.optional(),
    imageAspectRatio: z.string().optional(),
    imageMaxWidth: z.string().optional(),
    imageMaxHeight: z.string().optional(),
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