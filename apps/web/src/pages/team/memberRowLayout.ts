/**
 * True when the member at `index` renders reversed on the team page: with the
 * alternate-layout option on, odd rows flip sides (1st identification-left,
 * 2nd identification-right, 3rd like the 1st…). Mobile always stacks.
 */
export const isReversedRow = (index: number, alternate: boolean): boolean =>
  alternate && index % 2 === 1;
