import React from 'react';
import { Alert } from '@mui/material';
import type { SectionEditorProps } from './registry';

/**
 * Editor for a Text section. Controlled: reads `value`, emits changes via
 * `onChange`. Colocated with its renderer (`TextSection.tsx`).
 *
 * NOTE: stub — filled in by the section-editor build step.
 */
export const TextSectionEditor: React.FC<SectionEditorProps<'text'>> = () => (
  <Alert severity="info">Text section editor coming up.</Alert>
);
