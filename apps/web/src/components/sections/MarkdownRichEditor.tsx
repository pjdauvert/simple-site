import { useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { useIntl } from 'react-intl';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';
import { inlineFieldStyles } from './inlineField';

interface MarkdownRichEditorProps {
  value: string;
  onChange: (next: string) => void;
}

/** The editable surface inherits the surrounding typography (see inlineFieldStyles). */
const EditorSurface = styled('div')(inlineFieldStyles);

/**
 * Emits Markdown whenever the document changes, and re-imports Markdown when the
 * `value` prop is replaced from outside (e.g. a different section is selected).
 * Lexical is uncontrolled, so we diff against the last Markdown we emitted to
 * avoid clobbering the caret mid-edit.
 */
const MarkdownSync: React.FC<{ value: string; onChange: (next: string) => void }> = ({ value, onChange }) => {
  const [editor] = useLexicalComposerContext();
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.update(() => $convertFromMarkdownString(value, TRANSFORMERS));
  }, [editor, value]);

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const markdown = $convertToMarkdownString(TRANSFORMERS);
          if (markdown !== lastEmitted.current) {
            lastEmitted.current = markdown;
            onChange(markdown);
          }
        });
      }),
    [editor, onChange],
  );

  return null;
};

/**
 * In-place rich-text editor for a Markdown paragraph. Bold / italic / lists /
 * links / headings via Markdown shortcuts (e.g. `**bold**`, `- item`), serialised
 * back to the same Markdown string the config stores and `react-markdown` renders
 * publicly. Admin-only and lazy-loaded, so Lexical never reaches the public bundle.
 */
export const MarkdownRichEditor: React.FC<MarkdownRichEditorProps> = ({ value, onChange }) => {
  const intl = useIntl();

  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'section-paragraph',
        theme: {},
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
        editorState: () => $convertFromMarkdownString(value, TRANSFORMERS),
        onError: (error) => { throw error; },
      }}
    >
      <EditorSurface>
        <RichTextPlugin
          contentEditable={<ContentEditable style={{ outline: 'none' }} />}
          placeholder={
            <span style={{ opacity: 0.5, fontStyle: 'italic', pointerEvents: 'none' }}>
              {intl.formatMessage({ id: 'page.manage.pages.inline.field.paragraph' })}
            </span>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </EditorSurface>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <MarkdownSync value={value} onChange={onChange} />
    </LexicalComposer>
  );
};
