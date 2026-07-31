import type { TeamConfig, TeamSectionDesign } from '@simple-site/interfaces';
import {
  MEMBER_PAGE_DESIGN_DEFAULTS,
  TEAM_PAGE_DESIGN_DEFAULTS,
  type SectionDesignDefaults,
} from '../../../pages/team/teamDisplay';

export type SectionDefaults = SectionDesignDefaults;

/** Editable copy of one surface's design (colors as strings, defaults filled in). */
export interface SectionDesignDraft {
  pictureRadius: number;
  pictureBorder: boolean;
  pictureBorderColor: string;
  frameBackgroundColor: string;
  frameBorder: boolean;
  frameBorderColor: string;
}

export const toSectionDraft = (
  design: TeamSectionDesign | undefined,
  defaults: SectionDefaults,
): SectionDesignDraft => ({
  pictureRadius: design?.pictureRadius ?? defaults.pictureRadius,
  pictureBorder: design?.pictureBorder ?? defaults.pictureBorder,
  pictureBorderColor: design?.pictureBorderColor ?? '',
  frameBackgroundColor: design?.frameBackgroundColor ?? '',
  frameBorder: design?.frameBorder ?? defaults.frameBorder,
  frameBorderColor: design?.frameBorderColor ?? '',
});

/**
 * Stores only deviations from the surface defaults (colors only while their
 * feature is on); `undefined` when the draft is pristine — so an untouched
 * Design tab persists nothing.
 */
export const fromSectionDraft = (
  draft: SectionDesignDraft,
  defaults: SectionDefaults,
): TeamSectionDesign | undefined => {
  const design: TeamSectionDesign = {};
  if (draft.pictureRadius !== defaults.pictureRadius) design.pictureRadius = draft.pictureRadius;
  if (draft.pictureBorder !== defaults.pictureBorder) design.pictureBorder = draft.pictureBorder;
  if (draft.pictureBorder && draft.pictureBorderColor.trim()) design.pictureBorderColor = draft.pictureBorderColor.trim();
  if (draft.frameBackgroundColor.trim()) design.frameBackgroundColor = draft.frameBackgroundColor.trim();
  if (draft.frameBorder !== defaults.frameBorder) design.frameBorder = draft.frameBorder;
  if (draft.frameBorder && draft.frameBorderColor.trim()) design.frameBorderColor = draft.frameBorderColor.trim();
  return Object.keys(design).length > 0 ? design : undefined;
};

/** The `design` value to store for the two surfaces; `undefined` when both are pristine. */
export const buildDesign = (
  teamPage: SectionDesignDraft,
  memberPage: SectionDesignDraft,
): TeamConfig['design'] => {
  const teamPageDesign = fromSectionDraft(teamPage, TEAM_PAGE_DESIGN_DEFAULTS);
  const memberPageDesign = fromSectionDraft(memberPage, MEMBER_PAGE_DESIGN_DEFAULTS);
  if (!teamPageDesign && !memberPageDesign) return undefined;
  return {
    ...(teamPageDesign && { teamPage: teamPageDesign }),
    ...(memberPageDesign && { memberPage: memberPageDesign }),
  };
};
