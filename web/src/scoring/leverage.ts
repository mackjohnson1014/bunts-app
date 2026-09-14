import type { Matchup, MatchupCategory, Player } from '../types';
import { metaFor, orient } from './categories';
import { isPitcher } from './roster';

/**
 * How much a category is still worth caring about this week.
 *
 * The whole point of head-to-head categories is that a category you have
 * already won is worth nothing more, and one you cannot reach is worth nothing
 * either. Only the live ones should influence a lineup decision -- a swap that
 * adds two steals when steals are already won by eight is not an improvement,
 * it is noise wearing a recommendation's clothes.
 */

export type CategoryStatus = 'won' | 'lost' | 'live' | 'tied';

export interface CategoryState extends MatchupCategory {
  status: CategoryStatus;
  /** 0 = decided, 1 = coin flip. Weights everything downstream. */
  leverage: number;
  /** Margin oriented so positive always means you are ahead. */
  margin: number;
  /** Roughly how much the roster can still move this category. */
  swing: number;
}

/**
 * Estimate remaining production in a category from the active roster's own
 * per-game rates. Crude, and deliberately so: the alternative is projections
 * we do not have, and a rough swing is enough to separate "decided" from
 * "live", which is all this is used for.
 */
function estimateSwing(key: string, players: Player[], daysRemaining: number): number {
  const meta = metaFor(key);

  // Rate categories move by a fraction, not by accumulation. A week's worth of
  // at-bats shifts a weekly average by a few points at most.
  if (meta.rate) return key === 'AVG' ? 0.04 : 0.6;

  const relevant = players.filter((p) =>
    meta.side === 'pitching' ? isPitcher(p) : !isPitcher(p),
  );

  const perGame = relevant.reduce((sum, p) => {
    const games = p.seasonStats.G ?? 0;
    const total = p.seasonStats[key] ?? 0;
    return sum + (games > 0 ? total / games : 0);
  }, 0);

  // Pitchers do not appear daily; hitters roughly do.
  const appearanceRate = meta.side === 'pitching' ? 0.4 : 0.85;
  return perGame * daysRemaining * appearanceRate;
}

export function categoryStates(matchup: Matchup, players: Player[]): CategoryState[] {
  return matchup.categories.map((c) => {
    const margin = orient(c.key, c.mine) - orient(c.key, c.theirs);
    const swing = Math.max(estimateSwing(c.key, players, matchup.daysRemaining), 1e-6);

    // Expressed in units of what is still achievable: a two-run lead with ten
    // runs left to play is a coin flip; the same lead with one run left is over.
    const reach = Math.abs(margin) / swing;

    let status: CategoryStatus;
    if (Math.abs(margin) < 1e-9) status = 'tied';
    else if (reach > 1.5) status = margin > 0 ? 'won' : 'lost';
    else status = 'live';

    // Decays from 1 at level to 0 once the gap is out of reach.
    const leverage = status === 'won' || status === 'lost'
      ? 0
      : Math.max(0, 1 - reach / 1.5);

    return { ...c, margin, swing, status, leverage: Math.min(1, Math.max(0, leverage)) };
  });
}

export const liveCategories = (states: CategoryState[]): CategoryState[] =>
  states.filter((s) => s.leverage > 0).sort((a, b) => b.leverage - a.leverage);
