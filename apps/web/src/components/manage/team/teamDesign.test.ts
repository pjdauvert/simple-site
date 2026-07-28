import { describe, it, expect } from 'vitest';
import { MEMBER_PAGE_DESIGN_DEFAULTS, TEAM_PAGE_DESIGN_DEFAULTS } from '@simple-site/interfaces';
import { buildDesign, fromSectionDraft, toSectionDraft } from './teamDesign';

describe('toSectionDraft / fromSectionDraft', () => {
  it('fills surface defaults and round-trips to undefined when pristine', () => {
    const teamDraft = toSectionDraft(undefined, TEAM_PAGE_DESIGN_DEFAULTS);
    expect(teamDraft).toEqual({
      pictureRadius: 50,
      pictureBorder: false,
      pictureBorderColor: '',
      frameBackgroundColor: '',
      frameBorder: false,
      frameBorderColor: '',
    });
    expect(fromSectionDraft(teamDraft, TEAM_PAGE_DESIGN_DEFAULTS)).toBeUndefined();

    // The member page's frame border defaults ON — pristine there too.
    const memberDraft = toSectionDraft(undefined, MEMBER_PAGE_DESIGN_DEFAULTS);
    expect(memberDraft.frameBorder).toBe(true);
    expect(fromSectionDraft(memberDraft, MEMBER_PAGE_DESIGN_DEFAULTS)).toBeUndefined();
  });

  it('stores only deviations from the surface defaults', () => {
    const draft = {
      ...toSectionDraft(undefined, TEAM_PAGE_DESIGN_DEFAULTS),
      pictureRadius: 20,
      pictureBorder: true,
      pictureBorderColor: ' #ff0000 ',
      frameBorder: true,
    };
    expect(fromSectionDraft(draft, TEAM_PAGE_DESIGN_DEFAULTS)).toEqual({
      pictureRadius: 20,
      pictureBorder: true,
      pictureBorderColor: '#ff0000',
      frameBorder: true,
    });

    // Turning the member page's default border OFF is an explicit deviation.
    const memberDraft = { ...toSectionDraft(undefined, MEMBER_PAGE_DESIGN_DEFAULTS), frameBorder: false };
    expect(fromSectionDraft(memberDraft, MEMBER_PAGE_DESIGN_DEFAULTS)).toEqual({ frameBorder: false });
  });

  it('ignores colors of features that are off', () => {
    const draft = {
      ...toSectionDraft(undefined, TEAM_PAGE_DESIGN_DEFAULTS),
      pictureBorderColor: '#123456',
      frameBorderColor: '#654321',
    };
    expect(fromSectionDraft(draft, TEAM_PAGE_DESIGN_DEFAULTS)).toBeUndefined();
  });
});

describe('buildDesign', () => {
  it('collapses to undefined when both surfaces are pristine, else keeps the touched ones', () => {
    const teamDraft = toSectionDraft(undefined, TEAM_PAGE_DESIGN_DEFAULTS);
    const memberDraft = toSectionDraft(undefined, MEMBER_PAGE_DESIGN_DEFAULTS);
    expect(buildDesign(teamDraft, memberDraft)).toBeUndefined();

    expect(buildDesign({ ...teamDraft, pictureRadius: 0 }, memberDraft)).toEqual({
      teamPage: { pictureRadius: 0 },
    });
  });
});
