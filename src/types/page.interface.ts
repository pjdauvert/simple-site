import type { MenuItem } from "./menu.interface";

export interface PageConfiguration extends MenuItem {
    sections: PageSectionProps<PageSectionType>[];
}


export interface PageSectionProps<T extends PageSectionType> {
    name: string;
    type: T;
}

export const PageSectionType = {
    HERO: 'hero',
    TEXT: 'text',
} as const;

export type PageSectionType = typeof PageSectionType[keyof typeof PageSectionType];