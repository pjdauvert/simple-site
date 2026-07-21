import { Suspense, lazy, useState } from 'react';
import { Box } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import ReactMarkdown from 'react-markdown';
import { sectionContentKey } from '@simple-site/interfaces';
import { useSectionEdit } from './sectionEdit';
import { InlineTranslateButton } from './InlineControls';

// The rich-text surface is admin-only and pulls in Lexical, so it is loaded lazily
// and never reaches the public bundle.
const MarkdownRichEditor = lazy(() =>
  import('./MarkdownRichEditor').then((m) => ({ default: m.MarkdownRichEditor })),
);

interface EditableMarkdownProps {
  /** Page-scoped section name — the i18n key prefix. */
  sectionName: string;
  /** Dotted content path, e.g. `columns.0.paragraph`. */
  path: string;
  value?: string;
}

/**
 * A Markdown text slot declared by a section renderer.
 *
 * - **Public site** (no editing context): renders the stored Markdown through
 *   `react-markdown`, exactly as before — the config value is the i18n *default*,
 *   and a translation for the scoped key wins.
 * - **Admin, section selected**: becomes a rich-text surface that serializes back
 *   to the same Markdown string.
 */
export const EditableMarkdown: React.FC<EditableMarkdownProps> = ({ sectionName, path, value }) => {
  const edit = useSectionEdit();
  const [focused, setFocused] = useState(false);

  if (!edit) {
    if (!value) return null;
    return (
      <FormattedMessage id={sectionContentKey(sectionName, path)} defaultMessage={value}>
        {(msg) => <ReactMarkdown>{String(msg)}</ReactMarkdown>}
      </FormattedMessage>
    );
  }

  return (
    // Lexical owns focus inside the editor, so track it in the capture phase.
    <Box
      sx={{ position: 'relative' }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <Suspense fallback={<ReactMarkdown>{value ?? ''}</ReactMarkdown>}>
        <MarkdownRichEditor value={value ?? ''} onChange={(next) => edit.setContentAt(path, next)} />
      </Suspense>
      <InlineTranslateButton visible={focused} i18nKey={sectionContentKey(sectionName, path)} />
    </Box>
  );
};
