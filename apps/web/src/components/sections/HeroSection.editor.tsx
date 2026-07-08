import React from 'react';
import { Alert } from '@mui/material';
import type { SectionEditorProps } from './registry';

/**
 * Editor for a Hero section. Controlled: reads `value`, emits changes via
 * `onChange`. Colocated with its renderer (`HeroSection.tsx`).
 *
 * NOTE: stub — filled in by the section-editor build step.
 */
export const HeroSectionEditor: React.FC<SectionEditorProps<'hero'>> = () => (
  <Alert severity="info">Hero section editor coming up.</Alert>
);
