import type { Meeting } from '../types';
import type { CategoryState } from './leverage';

/**
 * Head-to-head scoring: the week's score, and the season series against one
 * opponent.
 *
 * League rules this encodes (as Mack described them):
 * - Each week is one matchup, scored by categories won ("6-3-1").
 * - Every team plays every other team twice in the regular season.
 * - Playoff tiebreaker #1 is the head-to-head record between the two teams.
 * - Tiebreaker #2 is the combined category score across both meetings.
 *   Won 8-1 and lost 5-4 -> 1-1 series, but 12-6 on points, so we hold it.
 */

export interface WeekScore {
  mine: number;
  theirs: number;
  ties: number;
}

/** The score if the week ended right now: who leads each category. */
export function weekScore(states: CategoryState[]): WeekScore {
  let mine = 0, theirs = 0, ties = 0;
  for (const s of states) {
    if (s.margin > 1e-9) mine++;
    else if (s.margin < -1e-9) theirs++;
    else ties++;
  }
  return { mine, theirs, ties };
}

export type MeetingResult = 'W' | 'L' | 'T';

export const meetingResult = (m: Meeting): MeetingResult | null => {
  if (m.mine === null || m.theirs === null) return null;
  return m.mine > m.theirs ? 'W' : m.mine < m.theirs ? 'L' : 'T';
};

export interface Series {
  /** Matchups won / lost / tied against this opponent. */
  wins: number;
  losses: number;
  ties: number;
  /** Categories won across those meetings -- tiebreaker #2. */
  pointsFor: number;
  pointsAgainst: number;
  /** Who holds the playoff tiebreaker on these meetings, and on which rule. */
  holder: 'us' | 'them' | 'even';
  decidedBy: 'record' | 'points' | null;
  /** Meetings counted (a live one counts as if it ended now, when included). */
  counted: number;
}

/**
 * Standing over whichever meetings are passed in. Callers decide whether a
 * live meeting counts: "as it stands" includes it at its current score,
 * "banked" passes only the finals.
 */
export function series(meetings: Meeting[]): Series {
  let wins = 0, losses = 0, ties = 0, pointsFor = 0, pointsAgainst = 0, counted = 0;
  for (const m of meetings) {
    const r = meetingResult(m);
    if (r === null) continue;
    counted++;
    if (r === 'W') wins++;
    else if (r === 'L') losses++;
    else ties++;
    pointsFor += m.mine ?? 0;
    pointsAgainst += m.theirs ?? 0;
  }

  let holder: Series['holder'] = 'even';
  let decidedBy: Series['decidedBy'] = null;
  if (wins !== losses) {
    holder = wins > losses ? 'us' : 'them';
    decidedBy = 'record';
  } else if (pointsFor !== pointsAgainst) {
    holder = pointsFor > pointsAgainst ? 'us' : 'them';
    decidedBy = 'points';
  }

  return { wins, losses, ties, pointsFor, pointsAgainst, holder, decidedBy, counted };
}

/** "1-0", or "1-0-1" when a meeting was tied. */
export const recordText = (w: number, l: number, t: number): string =>
  t > 0 ? `${w}–${l}–${t}` : `${w}–${l}`;
