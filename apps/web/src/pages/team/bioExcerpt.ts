/** Character budget of a biography on the team overview page before truncation. */
export const BIO_EXCERPT_LIMIT = 300;

/**
 * Word-safe markdown excerpt for the team-page rows: cuts the text to at most
 * `limit` characters without splitting a word, then repairs what the cut may
 * have broken — an unfinished inline link is dropped, an unclosed `**` emphasis
 * is closed, and trailing punctuation/whitespace is trimmed (the caller appends
 * the ellipsis link). Returns null when the text already fits.
 */
export const excerptMarkdown = (markdown: string, limit = BIO_EXCERPT_LIMIT): string | null => {
  if (markdown.length <= limit) return null;
  // Slice one char beyond the limit: if it lands mid-word the whole word drops.
  let cut = markdown.slice(0, limit + 1).replace(/\S*$/, '');
  // A link the cut left open (`[text` or `[text](url`) cannot render — drop it.
  cut = cut.replace(/\[[^\]]*(?:\]\([^)]*)?$/, '');
  // The ellipsis replaces any dangling punctuation.
  cut = cut.replace(/[\s,;:.!?…]+$/, '');
  // Close bold emphasis the cut left open.
  if ((cut.match(/\*\*/g) ?? []).length % 2 === 1) cut += '**';
  return cut;
};
