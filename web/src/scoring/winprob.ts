import { metaFor } from './categories';
import type { CategoryState } from './leverage';

/**
 * Chance of winning the week, built from the same margin/swing numbers the
 * category rows already use -- so the headline number can never disagree
 * with the rows underneath it.
 *
 * Each category is treated as a coin weighted by how far ahead or behind we
 * are relative to what can still move (margin / swing). The week is won by
 * taking more categories than the opponent, so the weighted coins are combined
 * exactly (a Poisson-binomial count), not averaged.
 *
 * It "updates as the week goes on" for free: swing shrinks as days run out,
 * so the same lead reads as more and more certain, and it recomputes from the
 * live totals every time the screen loads.
 */

export interface WeekOdds {
  win: number;
  tie: number;
  lose: number;
  /** Expected categories won / lost, e.g. 6.2 – 3.8 (level ones count for neither). */
  expectedFor: number;
  expectedAgainst: number;
  /** Per-category probability of finishing ahead, in input order. */
  perCategory: number[];
}

/** Abramowitz-Stegun 7.1.26; plenty accurate for a percentage on a phone. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592)
    * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/**
 * leverage.ts gives rate categories (AVG/ERA/WHIP) a fixed swing sized for a
 * full week, whatever day it is. That is fine for "live vs decided", but here
 * it would keep a rate category near 50/50 right up to Sunday night, so shrink
 * it with the square root of the week left -- how a rate's wobble shrinks as
 * fewer at-bats/innings remain.
 */
function effectiveSwing(state: CategoryState, daysRemaining: number): number {
  if (!metaFor(state.key).rate) return state.swing;
  return state.swing * Math.sqrt(Math.min(1, daysRemaining / 7));
}

/**
 * Swing is a rough "how much could still happen", so treat it as about two
 * standard deviations. At the 1.5x-swing line where leverage.ts calls a
 * category decided, that gives ~99.9% -- consistent with calling it decided.
 *
 * Returns [chance of finishing ahead, chance of finishing level]. Level only
 * has real weight once the week is over; mid-week an exact tie is rare enough
 * to ignore.
 */
export function categoryOutcome(state: CategoryState, daysRemaining: number): [number, number] {
  const swing = effectiveSwing(state, daysRemaining);
  if (daysRemaining <= 0 || swing <= 1e-6) {
    return state.margin > 1e-9 ? [1, 0] : state.margin < -1e-9 ? [0, 0] : [0, 1];
  }
  return [normalCdf(state.margin / (swing / 2)), 0];
}

export function weekOdds(states: CategoryState[], daysRemaining: number): WeekOdds {
  const outcomes = states.map((s) => categoryOutcome(s, daysRemaining));
  const perCategory = outcomes.map(([w]) => w);

  // dist[d] = probability that (categories won - categories lost) = d - n.
  const n = states.length;
  let dist = new Array(2 * n + 1).fill(0);
  dist[n] = 1;
  for (const [w, t] of outcomes) {
    const l = 1 - w - t;
    const next = new Array(2 * n + 1).fill(0);
    dist.forEach((q, d) => {
      if (q === 0) return;
      if (d + 1 <= 2 * n) next[d + 1] += q * w;
      next[d] += q * t;
      if (d - 1 >= 0) next[d - 1] += q * l;
    });
    dist = next;
  }

  let win = 0, tie = 0, lose = 0;
  dist.forEach((q, d) => {
    if (d > n) win += q;
    else if (d === n) tie += q;
    else lose += q;
  });

  const expectedFor = perCategory.reduce((a, b) => a + b, 0);
  const expectedAgainst = outcomes.reduce((a, [w, t]) => a + (1 - w - t), 0);
  return { win, tie, lose, expectedFor, expectedAgainst, perCategory };
}
