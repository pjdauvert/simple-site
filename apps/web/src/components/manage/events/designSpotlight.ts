import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';

/**
 * Highlight-on-edit wiring shared by the two events design tabs: the preview
 * element matching the field the admin is working on is ringed, so a design
 * option and its effect are never read in isolation ("card image ratio" rings
 * the card images, "full background" rings the page background).
 *
 * Each field group spreads `spotlight(<target>)` on its wrapper. Focus events
 * bubble in React, so one wrapper covers a group's label, inputs and switches
 * at once. The claim rules are deliberately asymmetric:
 * - focus (keyboard or click) CLAIMS the highlight and keeps it until another
 *   group claims it. A select opens its menu in a portal — focus leaves the
 *   wrapper — so clearing on blur would drop the ring exactly while the admin
 *   is choosing a value;
 * - the pointer claims it on enter and releases it on leave, but only while no
 *   field inside the group holds focus, so hovering around never steals the
 *   ring from the field being edited.
 */
export interface SpotlightProps {
  onFocus: () => void;
  onMouseEnter: () => void;
  onMouseLeave: (event: MouseEvent<HTMLElement>) => void;
}

export interface DesignSpotlight<T extends string> {
  /** The preview element to ring, or null while no field is engaged. */
  highlight: T | null;
  /** Props to spread on a field group's wrapper. */
  spotlight: (target: T) => SpotlightProps;
}

export const useDesignSpotlight = <T extends string>(): DesignSpotlight<T> => {
  const [highlight, setHighlight] = useState<T | null>(null);

  const spotlight = useCallback(
    (target: T): SpotlightProps => ({
      onFocus: () => setHighlight(target),
      onMouseEnter: () => setHighlight(target),
      onMouseLeave: (event) => {
        if (event.currentTarget.contains(document.activeElement)) return;
        setHighlight((current) => (current === target ? null : current));
      },
    }),
    [],
  );

  return { highlight, spotlight };
};

/**
 * The ring drawn around a highlighted preview element. An OUTLINE (a shape
 * appearing around the element), never a recolouring: the state has to read
 * without relying on colour perception, and the outline leaves the skeleton's
 * own geometry untouched — it is drawn outside the box, so nothing reflows
 * when the highlight moves.
 */
export const spotlightSx = (active: boolean): Record<string, unknown> =>
  active
    ? {
        outline: '2px solid',
        outlineColor: 'primary.main',
        outlineOffset: 3,
        // Keep the ring visible over the skeleton's own backgrounds.
        position: 'relative',
        zIndex: 1,
      }
    : {};
