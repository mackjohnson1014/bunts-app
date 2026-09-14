/**
 * Category metadata for a 10-category head-to-head league.
 *
 * Start/sit, the matchup view and keeper value all need three things about a
 * category: counting or rate, which direction wins, and which half of the
 * roster moves it. Getting ERA's direction wrong silently inverts every
 * recommendation, so it lives in one table rather than scattered conditionals.
 */

export type Side = 'hitting' | 'pitching';

export interface CategoryMeta {
  key: string;
  label: string;
  side: Side;
  /** Rate stats cannot be summed across players; counting stats can. */
  rate: boolean;
  /** ERA and WHIP are won by the lower number. */
  lowerWins: boolean;
  decimals: number;
}

export const CATEGORIES: Record<string, CategoryMeta> = {
  R:    { key: 'R',    label: 'Runs',       side: 'hitting',  rate: false, lowerWins: false, decimals: 0 },
  HR:   { key: 'HR',   label: 'Home runs',  side: 'hitting',  rate: false, lowerWins: false, decimals: 0 },
  RBI:  { key: 'RBI',  label: 'RBI',        side: 'hitting',  rate: false, lowerWins: false, decimals: 0 },
  SB:   { key: 'SB',   label: 'Steals',     side: 'hitting',  rate: false, lowerWins: false, decimals: 0 },
  AVG:  { key: 'AVG',  label: 'Average',    side: 'hitting',  rate: true,  lowerWins: false, decimals: 3 },
  W:    { key: 'W',    label: 'Wins',       side: 'pitching', rate: false, lowerWins: false, decimals: 0 },
  SV:   { key: 'SV',   label: 'Saves',      side: 'pitching', rate: false, lowerWins: false, decimals: 0 },
  K:    { key: 'K',    label: 'Strikeouts', side: 'pitching', rate: false, lowerWins: false, decimals: 0 },
  ERA:  { key: 'ERA',  label: 'ERA',        side: 'pitching', rate: true,  lowerWins: true,  decimals: 2 },
  WHIP: { key: 'WHIP', label: 'WHIP',       side: 'pitching', rate: true,  lowerWins: true,  decimals: 2 },
};

export const metaFor = (key: string): CategoryMeta =>
  CATEGORIES[key] ?? { key, label: key, side: 'hitting', rate: false, lowerWins: false, decimals: 0 };

/** Signed so "bigger is better" holds for every category. */
export const orient = (key: string, value: number): number =>
  metaFor(key).lowerWins ? -value : value;

export const formatStat = (key: string, value: number | undefined): string => {
  if (value === undefined || Number.isNaN(value)) return '–';
  const m = metaFor(key);
  const s = value.toFixed(m.decimals);
  return m.decimals === 3 ? s.replace(/^0/, '') : s;
};
