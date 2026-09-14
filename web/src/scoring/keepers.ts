import type { KeeperCandidate, Player, Roster } from '../types';
import { metaFor } from './categories';

/**
 * Keeper value for a league that keeps a fixed number of players at no cost.
 *
 * With no draft-pick price, the question is simply "who are the most valuable
 * players on this roster next season", so this ranks season-long production
 * across the scoring categories.
 *
 * The honest limitation: proper keeper value compares a player to everyone
 * available, and we only have this roster. So the baseline here is the roster's
 * own average, which means the numbers rank *these* players against each other
 * and say nothing about whether any of them is worth keeping over a waiver
 * pickup. That is a real gap, not a rounding error, and the UI says so.
 */

const isPitcher = (p: Player) => p.positions.some((x) => x === 'SP' || x === 'RP' || x === 'P');

/**
 * Scarcity is a BONUS, not a multiplier.
 *
 * Multiplying the total was a bug: a below-average catcher has a negative
 * score, so a 1.18x "bonus" pushed him further down the list. Expressed in the
 * same standard-deviation units as everything else, it lifts scarce positions
 * regardless of sign, which is what scarcity actually means.
 */
const SCARCITY: Record<string, number> = { C: 0.9, SS: 0.3, '2B': 0.2, '3B': 0.1, RP: -0.2 };
const scarcityFor = (p: Player) =>
  Math.max(...p.positions.map((pos) => SCARCITY[pos] ?? 0));

interface Standardised {
  player: Player;
  score: number;
  best: string[];
}

export function keeperTally(roster: Roster): KeeperCandidate[] {
  const categories = roster.league.scoringCategories;
  const players = roster.players.filter((p) => (p.seasonStats.G ?? 0) > 0);
  if (players.length === 0) return [];

  const hitters = players.filter((p) => !isPitcher(p));
  const pitchers = players.filter(isPitcher);

  const scored: Standardised[] = [];
  for (const [group, side] of [[hitters, 'hitting'], [pitchers, 'pitching']] as const) {
    const keys = categories.filter((k) => metaFor(k).side === side);

    // Mean and spread per category, within the group. Comparing a hitter's
    // home runs to a pitcher's strikeouts directly would be meaningless.
    const stats = keys.map((key) => {
      const meta = metaFor(key);
      const values = group.map((p) => {
        const raw = p.seasonStats[key];
        if (raw === undefined) return 0;
        // Counting stats are compared per game so a part-season is not punished.
        return meta.rate ? raw : raw / (p.seasonStats.G ?? 1);
      });
      const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length || 1);
      return { key, meta, mean, sd: Math.sqrt(variance) || 1 };
    });

    for (const player of group) {
      const contributions = stats.map(({ key, meta, mean, sd }) => {
        const raw = player.seasonStats[key];
        const value = raw === undefined ? mean : meta.rate ? raw : raw / (player.seasonStats.G ?? 1);
        const z = (value - mean) / sd;
        return { key, z: meta.lowerWins ? -z : z };
      });

      const total = contributions.reduce((a, c) => a + c.z, 0) + scarcityFor(player);
      const best = contributions
        .filter((c) => c.z > 0.5)
        .sort((a, b) => b.z - a.z)
        .slice(0, 2)
        .map((c) => c.key);

      scored.push({ player, score: total, best });
    }
  }

  // Map onto a 0-100 display scale; the underlying units are standard
  // deviations, which mean nothing to anyone reading a phone screen.
  const max = Math.max(...scored.map((s) => s.score));
  const min = Math.min(...scored.map((s) => s.score));
  const span = max - min || 1;

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({
      playerKey: s.player.playerKey,
      rank: i + 1,
      score: Math.round(((s.score - min) / span) * 90 + 10),
      note: noteFor(s),
    }));
}

function noteFor(s: Standardised): string {
  const scarce = scarcityFor(s.player) >= 0.3;
  if (s.best.length === 0) {
    return scarce
      ? `Thin production, but the position is hard to fill.`
      : `Below this roster's average in most categories.`;
  }
  const cats = s.best.join(' and ');
  return scarce
    ? `Carries ${cats}, and ${s.player.positions[0]} is scarce.`
    : `Carries ${cats} relative to the rest of the roster.`;
}
