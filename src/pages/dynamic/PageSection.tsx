import React from 'react';
import  { type SectionProps, SectionTypesEnum, type SectionType } from '../../types/section.interface';
import { TextSection } from '../../components/sections/TextSection';
import { HeroSection } from '../../components/sections/HeroSection';


export const PageSection: React.FC<SectionProps<SectionType>> = (props) => {


  if (props.type === SectionTypesEnum.HERO) {
    return <HeroSection {...props} />;
  }

  if (props.type === SectionTypesEnum.TEXT) {
    return <TextSection {...props} />;
  }

  return null;
};

