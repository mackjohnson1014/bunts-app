import type { Player, Slot } from '../types';

/**
 * The league's roster structure.
 *
 * Eligibility is not "does the player list this slot". UTIL takes any hitter
 * and P takes any pitcher, so a check for a literal slot match silently makes
 * every UTIL and P swap impossible -- the engine looks conservative when it is
 * actually blind.
 */

export interface SlotSpec {
  slot: Slot;
  count: number;
  label: string;
}

export const ACTIVE_SLOTS: SlotSpec[] = [
  { slot: 'C',    count: 1, label: 'Catcher' },
  { slot: '1B',   count: 1, label: 'First base' },
  { slot: '2B',   count: 1, label: 'Second base' },
  { slot: 'SS',   count: 1, label: 'Shortstop' },
  { slot: '3B',   count: 1, label: 'Third base' },
  { slot: 'OF',   count: 3, label: 'Outfield' },
  { slot: 'UTIL', count: 2, label: 'Utility' },
  { slot: 'SP',   count: 3, label: 'Starting pitcher' },
  { slot: 'RP',   count: 2, label: 'Relief pitcher' },
  { slot: 'P',    count: 3, label: 'Pitcher' },
];

export const BENCH_SPOTS = 7;
export const IL_SPOTS = 3;

export const ACTIVE_COUNT = ACTIVE_SLOTS.reduce((n, s) => n + s.count, 0);   // 18

const PITCHING_POSITIONS = new Set(['SP', 'RP', 'P']);

export const isPitcher = (p: Player): boolean =>
  p.positions.some((x) => PITCHING_POSITIONS.has(x));

/** Can this player legally occupy this slot? */
export function eligible(player: Player, slot: Slot): boolean {
  if (slot === 'BN' || slot === 'IL' || slot === 'NA') return true;

  // The two catch-all slots.
  if (slot === 'UTIL') return !isPitcher(player);
  if (slot === 'P') return isPitcher(player);

  return player.positions.includes(slot);
}

/**
 * Bench players who could take over a given slot, most flexible last so a
 * single-position player is used before a player who can cover several.
 */
export function candidatesFor(slot: Slot, bench: Player[]): Player[] {
  return bench
    .filter((p) => eligible(p, slot))
    .sort((a, b) => a.positions.length - b.positions.length);
}
