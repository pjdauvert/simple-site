import { useLayoutEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { useIntl } from 'react-intl';
import { inlineFieldStyles } from './inlineField';

const RawMarkdown = styled('textarea')(inlineFieldStyles);

interface MarkdownRichEditorProps {
  value: string;
  onChange: (next: string) => void;
}

/**
 * In-place editor for a Markdown paragraph. Interim implementation: an
 * auto-growing raw-Markdown field that inherits the surrounding typography.
 * Replaced by the Lexical rich-text surface (same Markdown in/out contract).
 */
export const MarkdownRichEditor: React.FC<MarkdownRichEditorProps> = ({ value, onChange }) => {
  const intl = useIntl();
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <RawMarkdown
      ref={ref}
      rows={1}
      value={value}
      placeholder={intl.formatMessage({ id: 'page.manage.pages.inline.field.paragraph' })}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
