import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SectionProps, SectionType } from '@simple-site/interfaces';
import { SectionEditContext, getAtPath, setAtPath } from '../../sections/sectionEdit';
import type { SectionEditContextValue } from '../../sections/sectionEdit';
import { SECTION_REGISTRY } from '../../sections/registry';
import { ImagePickerDialog } from '../../media';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';

interface SectionEditProviderProps {
  section: SectionProps<SectionType>;
  onChange: (next: SectionProps<SectionType>) => void;
  children: ReactNode;
}

/**
 * Supplies the inline editing behaviour to the editable slots a section renderer
 * declares. Patches land at a dotted path within `content`/`design` and are run
 * through the section type's `normalize`, so an in-place edit produces exactly the
 * same clean object the form editor would.
 */
export const SectionEditProvider: React.FC<SectionEditProviderProps> = ({ section, onChange, children }) => {
  const flags = useFeatureFlags();
  const canPickImage = Boolean(flags?.media);
  const [pickerPath, setPickerPath] = useState<string | null>(null);

  const value = useMemo<SectionEditContextValue>(() => {
    // Looked up by `section.type`, so the cast to the union-props normalizer is sound.
    const normalize = SECTION_REGISTRY[section.type].normalize as (
      s: SectionProps<SectionType>,
    ) => SectionProps<SectionType>;
    const emit = (next: SectionProps<SectionType>) => onChange(normalize(next));
    const listAt = (contentPath: string) =>
      (getAtPath(section, `content.${contentPath}`) as unknown[] | undefined) ?? [];

    return {
      canPickImage,
      setContentAt: (path, val) => emit(setAtPath(section, `content.${path}`, val)),
      setDesignAt: (path, val) => emit(setAtPath(section, `design.${path}`, val)),
      pickImageAt: (designPath) => setPickerPath(designPath),
      addItemAt: (contentPath, blank) =>
        emit(setAtPath(section, `content.${contentPath}`, [...listAt(contentPath), blank])),
      removeItemAt: (contentPath, index) =>
        emit(setAtPath(section, `content.${contentPath}`, listAt(contentPath).filter((_, i) => i !== index))),
    };
  }, [section, onChange, canPickImage]);

  return (
    <SectionEditContext.Provider value={value}>
      {children}
      <ImagePickerDialog
        open={pickerPath !== null}
        onClose={() => setPickerPath(null)}
        onSelect={(url) => {
          if (pickerPath) value.setDesignAt(pickerPath, url);
          setPickerPath(null);
        }}
      />
    </SectionEditContext.Provider>
  );
};
