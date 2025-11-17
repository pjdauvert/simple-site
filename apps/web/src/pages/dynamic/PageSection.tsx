import React from 'react';
import { type SectionProps, type SectionType, SectionTypesEnum } from '@simple-site/interfaces';
import { TextSection } from '../../components/sections/TextSection';
import { HeroSection } from '../../components/sections/HeroSection';


export const PageSection: React.FC<SectionProps<SectionType>> = (props) => {

  switch (props.type) {
    case SectionTypesEnum.HERO:
      return <HeroSection {...props} />;
    case SectionTypesEnum.TEXT:
      return <TextSection {...props} />;
    default:
      return null;
  }
};
