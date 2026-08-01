import type { ComponentProps, CSSProperties } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link as RouterLink } from 'react-router-dom';
import {
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

/** GFM column alignment arrives as an inline `text-align` style on th/td. */
const cellAlign = (style: CSSProperties | undefined): ComponentProps<typeof TableCell>['align'] => {
  const align = style?.textAlign;
  return align === 'left' || align === 'center' || align === 'right' ? align : undefined;
};

const components: Components = {
  // Internal links stay in the SPA; external author-provided links open a new tab.
  a: ({ href = '', title, children }) =>
    href.startsWith('/') || href.startsWith('#') ? (
      <Link component={RouterLink} to={href} title={title}>
        {children}
      </Link>
    ) : (
      <Link href={href} title={title} target="_blank" rel="noopener noreferrer">
        {children}
      </Link>
    ),
  // The container scrolls horizontally so wide tables never break mobile layouts.
  table: ({ children }) => (
    <TableContainer sx={{ my: 2 }}>
      <Table size="small" sx={{ width: 'auto' }}>
        {children}
      </Table>
    </TableContainer>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ style, children }) => (
    <TableCell component="th" align={cellAlign(style)} sx={{ fontWeight: 600 }}>
      {children}
    </TableCell>
  ),
  td: ({ style, children }) => <TableCell align={cellAlign(style)}>{children}</TableCell>,
};

interface MarkdownProps {
  children: string;
}

/**
 * The site's markdown renderer: GitHub-flavored markdown (tables, strikethrough,
 * task lists, autolinks) with MUI-styled tables and SPA-aware links. Every
 * markdown surface (section slots, team bios, team presentation) renders through
 * this component so authored content behaves the same everywhere.
 */
export const Markdown: React.FC<MarkdownProps> = ({ children }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
    {children}
  </ReactMarkdown>
);
