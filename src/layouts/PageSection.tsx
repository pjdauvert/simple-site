import React from 'react';
import { type PageSectionProps, PageSectionType } from '../types/page.interface';
import { TextSection, type TextSectionProps } from '../components/TextSection';
import { HeroSection, type HeroSectionProps } from '../components/HeroSection';


export const PageSection: React.FC<PageSectionProps<PageSectionType>> = (props) => {
  if (props.type === PageSectionType.HERO) {
    return (
      <HeroSection {...props as HeroSectionProps} />
    );
  }

  if (props.type === PageSectionType.TEXT) {
    return (
     <TextSection {...props as TextSectionProps} />
    );
  }

  return null;
};

