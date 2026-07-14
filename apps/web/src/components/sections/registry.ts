import React, { lazy } from 'react';
import ViewCarouselOutlinedIcon from '@mui/icons-material/ViewCarouselOutlined';
import TextSnippetOutlinedIcon from '@mui/icons-material/TextSnippetOutlined';
import {
  type SectionProps,
  type SectionType,
  SectionTypesEnum,
} from '@simple-site/interfaces';
import { normalizeHeroSection } from './HeroSection.normalize';
import { normalizeTextSection } from './TextSection.normalize';

/**
 * Props every section editor receives. An editor is a controlled component: it
 * reads the section from `value` and emits the next version via `onChange`. It
 * never mutates `value` in place and never persists — persistence is the
 * PagesEditor's job (whole-draft save).
 */
export interface SectionEditorProps<T extends SectionType = SectionType> {
  /** The section being edited, narrowed to type `T`. */
  value: SectionProps<T>;
  /** Emit the next version of the section. */
  onChange: (next: SectionProps<T>) => void;
  /**
   * Page-scoped i18n prefix (`pageName.sectionName`). Editors edit i18n default
   * values held on the section; the localized overrides live on the Translations
   * page. This prefix is provided for reference/preview keying.
   */
  pageName: string;
}

export type SectionRenderer<T extends SectionType = SectionType> = React.ComponentType<SectionProps<T>>;
export type SectionEditor<T extends SectionType = SectionType> = React.ComponentType<SectionEditorProps<T>>;

/**
 * Everything the app needs to render, edit and create a section of a given type.
 * Adding a section type means: define its interface in `libs/interfaces`, add a
 * `*.editor.tsx` next to its renderer, and add one entry here — the public
 * renderer (`PageSection`), the admin editor and the add-section picker all read
 * from this registry.
 */
export interface SectionDefinition<T extends SectionType = SectionType> {
  type: T;
  /** i18n key for the human label used in the section-type picker. */
  labelKey: string;
  /** Fallback label when no translation is loaded. */
  label: string;
  /** Icon component, rendered as `<def.Icon fontSize="small" />`. */
  Icon: React.ElementType;
  /** Public-site renderer (lazy — own chunk). */
  Renderer: React.LazyExoticComponent<SectionRenderer<T>>;
  /** Admin editor (lazy — only pulled into the /manage bundle). */
  Editor: React.LazyExoticComponent<SectionEditor<T>>;
  /** Build a blank, schema-valid section of this type with the given name. */
  createDefault: (sectionName: string) => SectionProps<T>;
  /**
   * Canonicalize a section (drop empty optionals) so it serializes clean. Used by
   * the form editor and by inline edits, which patch raw values at a path.
   */
  normalize: (section: SectionProps<T>) => SectionProps<T>;
}

const HeroRenderer: React.LazyExoticComponent<SectionRenderer<'hero'>> = lazy(() =>
  import('./HeroSection').then((m) => ({ default: m.HeroSection })),
);
const TextRenderer: React.LazyExoticComponent<SectionRenderer<'text'>> = lazy(() =>
  import('./TextSection').then((m) => ({ default: m.TextSection })),
);
const HeroEditor: React.LazyExoticComponent<SectionEditor<'hero'>> = lazy(() =>
  import('./HeroSection.editor').then((m) => ({ default: m.HeroSectionEditor })),
);
const TextEditor: React.LazyExoticComponent<SectionEditor<'text'>> = lazy(() =>
  import('./TextSection.editor').then((m) => ({ default: m.TextSectionEditor })),
);

const heroDefinition: SectionDefinition<'hero'> = {
  type: SectionTypesEnum.HERO,
  labelKey: 'page.manage.pages.sectionType.hero',
  label: 'Hero',
  Icon: ViewCarouselOutlinedIcon,
  Renderer: HeroRenderer,
  Editor: HeroEditor,
  createDefault: (sectionName) => ({ type: SectionTypesEnum.HERO, sectionName, content: {} }),
  normalize: normalizeHeroSection,
};

const textDefinition: SectionDefinition<'text'> = {
  type: SectionTypesEnum.TEXT,
  labelKey: 'page.manage.pages.sectionType.text',
  label: 'Text',
  Icon: TextSnippetOutlinedIcon,
  Renderer: TextRenderer,
  Editor: TextEditor,
  createDefault: (sectionName) => ({
    type: SectionTypesEnum.TEXT,
    sectionName,
    content: { columns: [{ title: '', paragraph: '' }] },
  }),
  normalize: normalizeTextSection,
};

/** Lookup table: section type → its definition. */
export const SECTION_REGISTRY: { [K in SectionType]: SectionDefinition<K> } = {
  [SectionTypesEnum.HERO]: heroDefinition,
  [SectionTypesEnum.TEXT]: textDefinition,
};

/** Ordered list of definitions, for the add-section type picker. */
export const SECTION_DEFINITIONS = Object.values(SECTION_REGISTRY) as SectionDefinition[];
