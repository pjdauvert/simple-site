import { useLayoutEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { FormattedMessage, useIntl } from 'react-intl';
import { sectionContentKey } from '@simple-site/interfaces';
import { useSectionEdit } from './sectionEdit';
import { inlineFieldStyles } from './inlineField';

const InlineInput = styled('input')(inlineFieldStyles);
const InlineTextArea = styled('textarea')(inlineFieldStyles);

/** Ghost placeholder per field, derived from the last segment of the content path. */
const PLACEHOLDER_KEY: Record<string, string> = {
  title: 'page.manage.pages.inline.field.title',
  subtitle: 'page.manage.pages.inline.field.subtitle',
  label: 'page.manage.pages.inline.field.label',
  value: 'page.manage.pages.inline.field.value',
  paragraph: 'page.manage.pages.inline.field.paragraph',
};

interface EditableTextProps {
  /** Page-scoped section name — the i18n key prefix. */
  sectionName: string;
  /** Dotted content path, e.g. `title` or `ctaButtons.0.label`. */
  path: string;
  value?: string;
  /** Render as an auto-growing textarea (wraps) rather than a single-line input. */
  multiline?: boolean;
  /** Size the field to its content instead of filling the line (e.g. a button label). */
  autoWidth?: boolean;
}

/**
 * A translatable text slot declared by a section renderer.
 *
 * - **Public site** (no editing context): renders exactly the `FormattedMessage`
 *   the renderer used before — the config value is the i18n *default*, and a
 *   translation for the scoped key wins.
 * - **Admin, section selected**: becomes an in-place field that writes back to the
 *   config default at `path`.
 */
export const EditableText: React.FC<EditableTextProps> = ({
  sectionName,
  path,
  value,
  multiline,
  autoWidth,
}) => {
  const edit = useSectionEdit();
  const intl = useIntl();
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea so wrapped text keeps the height it renders at.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !multiline || !edit) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, multiline, edit]);

  if (!edit) {
    if (!value) return null;
    return <FormattedMessage id={sectionContentKey(sectionName, path)} defaultMessage={value} />;
  }

  const field = path.split('.').pop() ?? '';
  const placeholderKey = PLACEHOLDER_KEY[field];
  const placeholder = placeholderKey ? intl.formatMessage({ id: placeholderKey }) : undefined;
  const commit = (next: string) => edit.setContentAt(path, next);

  if (multiline) {
    return (
      <InlineTextArea
        ref={ref}
        rows={1}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => commit(e.target.value)}
      />
    );
  }

  return (
    <InlineInput
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => commit(e.target.value)}
      size={autoWidth ? Math.max((value ?? '').length, placeholder?.length ?? 0, 4) : undefined}
      sx={autoWidth ? { width: 'auto' } : undefined}
    />
  );
};
