import type { Media, TextColumnContent, TextColumnDesign, TextDesign, TextSectionProps } from '@simple-site/interfaces';

const nonEmpty = (s?: string): string | undefined => (s && s.length > 0 ? s : undefined);

const cleanColumn = (col: TextColumnContent): TextColumnContent => {
  const out: TextColumnContent = {};
  const title = nonEmpty(col.title);
  const paragraph = nonEmpty(col.paragraph);
  if (title) out.title = title;
  if (paragraph) out.paragraph = paragraph;
  return out;
};

const cleanMedia = (m?: Media): Media | undefined => {
  const url = nonEmpty(m?.url);
  if (!m || !url) return undefined;
  const out: Media = { url };
  if (m.position) out.position = m.position;
  if (m.verticalAlign) out.verticalAlign = m.verticalAlign;
  if (m.horizontalAlign) out.horizontalAlign = m.horizontalAlign;
  const maxWidth = nonEmpty(m.maxWidth);
  const maxHeight = nonEmpty(m.maxHeight);
  if (maxWidth) out.maxWidth = maxWidth;
  if (maxHeight) out.maxHeight = maxHeight;
  return out;
};

const cleanColumnDesign = (cfg?: TextColumnDesign): TextColumnDesign => {
  const out: TextColumnDesign = {};
  if (!cfg) return out;
  if (cfg.hideOnBreakpoints && cfg.hideOnBreakpoints.length > 0) out.hideOnBreakpoints = cfg.hideOnBreakpoints;
  if (cfg.textHorizontalAlign) out.textHorizontalAlign = cfg.textHorizontalAlign;
  if (cfg.textVerticalAlign) out.textVerticalAlign = cfg.textVerticalAlign;
  const media = cleanMedia(cfg.media);
  if (media) out.media = media;
  return out;
};

const cleanDesign = (d: TextDesign | undefined, columnCount: number): TextDesign | undefined => {
  if (!d) return undefined;
  const out: TextDesign = {};
  const backgroundColor = nonEmpty(d.backgroundColor);
  const textColor = nonEmpty(d.textColor);
  const backgroundUrl = nonEmpty(d.backgroundUrl);
  if (backgroundColor) out.backgroundColor = backgroundColor;
  if (textColor) out.textColor = textColor;
  if (backgroundUrl) out.backgroundUrl = backgroundUrl;
  if (backgroundUrl && d.parallax) out.parallax = true;

  // Ratios are only valid for 2..4 columns; align length to the column count.
  if (d.columnLayout && columnCount > 1) {
    const layout = d.columnLayout.slice(0, columnCount).map((n) => (Number.isFinite(n) && n > 0 ? n : 1));
    while (layout.length < columnCount) layout.push(1);
    if (layout.length >= 2 && layout.length <= 4) out.columnLayout = layout;
  }

  // Per-column config: clean each entry, drop trailing empties, keep index alignment.
  if (d.columnConfig) {
    const cfgs = d.columnConfig.slice(0, columnCount).map(cleanColumnDesign);
    let lastNonEmpty = -1;
    cfgs.forEach((c, i) => { if (Object.keys(c).length > 0) lastNonEmpty = i; });
    if (lastNonEmpty >= 0) out.columnConfig = cfgs.slice(0, lastNonEmpty + 1);
  }

  return Object.keys(out).length > 0 ? out : undefined;
};

/**
 * Canonicalize a text section: empty optionals drop out, `content.columns` always
 * keeps at least one column, `design` is omitted when empty, and `columnConfig`
 * stays index-aligned to the columns. Shared by the section's form editor and by
 * inline (in-place) edits.
 */
export const normalizeTextSection = (section: TextSectionProps): TextSectionProps => {
  const cleaned = section.content.columns.map(cleanColumn);
  const columns = cleaned.length > 0 ? cleaned : [{}];
  const content = { columns };
  const design = cleanDesign(section.design, columns.length);
  const base: TextSectionProps = { type: section.type, sectionName: section.sectionName, content };
  return design ? { ...base, design } : base;
};
