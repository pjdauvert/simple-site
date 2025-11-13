import { z } from "zod";

export const BreakpointsEnum = {
    XS: 'xs',
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl',
  } as const;

  export const BreakpointSchema = z.enum(Object.values(BreakpointsEnum));

  export const SectionImagePositionEnum = {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom',
    BACKGROUND: 'background',
  } as const;
  
  export const SectionImagePositionSchema = z.enum(Object.values(SectionImagePositionEnum));
  
  const SectionImageSizeEnum = {
    COVER: 'cover',
    CONTAIN: 'contain',
    FILL: 'fill',
    SCALE_DOWN: 'scale-down',
  } as const;
  
  export const SectionImageSizeSchema = z.enum(Object.values(SectionImageSizeEnum));
  
  const ColumnVerticalAlignEnum = {
    TOP: 'top',
    CENTER: 'center',
    BOTTOM: 'bottom',
    STRETCH: 'stretch',
  } as const;
  
  export const ColumnVerticalAlignSchema = z.enum(Object.values(ColumnVerticalAlignEnum));