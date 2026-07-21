import React, { Suspense } from 'react';
import { type SectionProps, type SectionType } from '@simple-site/interfaces';
import { Loading } from '../../components/Loading';
import { SECTION_REGISTRY } from '../../components/sections/registry';

/**
 * Renders a single section by dispatching on its `type` through the section
 * registry (which colocates each type's renderer, editor and defaults). The
 * renderer is looked up by `props.type`, so the cast to the union-props
 * component type is sound.
 */
export const PageSection: React.FC<SectionProps<SectionType>> = (props) => {
  const definition = SECTION_REGISTRY[props.type];
  if (!definition) return null;

  const Renderer = definition.Renderer as React.ComponentType<SectionProps<SectionType>>;

  return (
    <Suspense fallback={<Loading />}>
      <Renderer {...props} />
    </Suspense>
  );
};
