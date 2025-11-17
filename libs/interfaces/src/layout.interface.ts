import { z } from "zod";

export const BreakpointsEnum = {
    XS: 'xs',
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl',
  } as const;

  export const BreakpointSchema = z.enum(Object.values(BreakpointsEnum));

  // Simplified media size for text sections
  const MediaPositionEnum = {
    COVER: 'cover',
    CONTAIN: 'contain',
  } as const;
  
  export const MediaPositionSchema = z.enum(Object.values(MediaPositionEnum));

  // Media vertical alignment (top, middle, bottom)
  const VerticalAlignEnum = {
    TOP: 'top',
    MIDDLE: 'middle',
    BOTTOM: 'bottom',
    STRETCH: 'stretch',
  } as const;
  
  export const VerticalAlignSchema = z.enum(Object.values(VerticalAlignEnum));
  
  const HorizontalAlignEnum = {
    LEFT: 'left',
    CENTER: 'center',
    RIGHT: 'right',
    SPAN: 'span',
  } as const;
  
  export const HorizontalAlignSchema = z.enum(Object.values(HorizontalAlignEnum));
