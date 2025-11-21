import React, { lazy, Suspense } from 'react';
import { type SectionProps, type SectionType, SectionTypesEnum } from '@simple-site/interfaces';
import { Loading } from '../../components/Loading';

// Lazy load section components - each will be in a separate chunk
const HeroSection = lazy(() => 
  import('../../components/sections/HeroSection').then(module => ({ default: module.HeroSection }))
);
const TextSection = lazy(() => 
  import('../../components/sections/TextSection').then(module => ({ default: module.TextSection }))
);

export const PageSection: React.FC<SectionProps<SectionType>> = (props) => {
  // Helper to wrap each section in Suspense
  const renderSection = () => {
    switch (props.type) {
      case SectionTypesEnum.HERO:
        return <HeroSection {...props} />;
      case SectionTypesEnum.TEXT:
        return <TextSection {...props} />;
      default:
        return null;
    }
  };

  return (
    <Suspense fallback={<Loading />}>
      {renderSection()}
    </Suspense>
  );
};
