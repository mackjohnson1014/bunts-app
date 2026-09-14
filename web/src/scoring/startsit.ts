import type { LineupCall, Matchup, Player, Roster } from '../types';
import { STARTING_SLOTS } from '../types';
import { metaFor } from './categories';
import { categoryStates, liveCategories, type CategoryState } from './leverage';

/**
 * Start/sit for head-to-head categories.
 *
 * The question is never "who is better" in the abstract. It is "who helps the
 * categories I can still win this week". A swap that adds steals when steals
 * are already won by eight is not an improvement.
 *
 * Deliberate conservatism, in order of importance:
 *
 *  1. A player confirmed out of tonight's lineup contributes nothing. That is
 *     the one fact here we actually know rather than estimate.
 *  2. A player whose lineup has not been posted is discounted, never zeroed.
 *     Treating unknown as benched is how an app tells you to sit someone who
 *     then goes 3-for-4.
 *  3. Nothing is recommended unless the margin clears a threshold. A
 *     recommendation for a 2% edge is noise, and noise trains you to ignore
 *     the alerts that matter.
 */

const isPitcher = (p: Player) => p.positions.some((x) => x === 'SP' || x === 'RP' || x === 'P');

/**
 * "Starting today" means three different things depending on the player, and
 * conflating them produces confident nonsense.
 *
 *  - A batter not in the posted lineup has been scratched. That is news.
 *  - A starting pitcher not pitching today is simply not his turn in the
 *    rotation. Telling someone to bench their ace on his off day is noise, and
 *    it is the kind of noise that trains people to ignore the alerts.
 *  - A reliever never appears in a posted lineup at all, so the field carries
 *    no information about him whatsoever.
 */
type Role = 'batter' | 'starter' | 'reliever';

function roleOf(p: Player): Role {
  const hasSP = p.positions.includes('SP');
  const hasRP = p.positions.includes('RP');
  if (hasSP) return 'starter';
  if (hasRP || p.positions.includes('P')) return 'reliever';
  return 'batter';
}

/** Confidence that this player actually plays today. */
function availability(p: Player): number {
  if (p.startingToday === false) return 0;
  if (p.startingToday === null) return 0.55;   // lineup not posted yet
  if (p.status && p.status !== 'DTD') return 0;
  if (p.status === 'DTD') return 0.8;
  return 1;
}

/**
 * Expected contribution to the live categories, per game, weighted by how much
 * each category still matters. Rate categories are handled separately: for
 * those, what matters is whether the player is better or worse than the team's
 * own current mark, since a below-average bat actively drags AVG down.
 */
function weeklyValue(p: Player, states: CategoryState[]): number {
  const games = p.seasonStats.G ?? 0;
  if (games === 0) return 0;

  const side = isPitcher(p) ? 'pitching' : 'hitting';
  let value = 0;

  for (const state of liveCategories(states)) {
    const meta = metaFor(state.key);
    if (meta.side !== side) continue;

    if (meta.rate) {
      const mine = p.seasonStats[state.key];
      if (mine === undefined) continue;
      // Positive when the player is better than what the team is currently
      // posting in that category, negative when he would drag it down.
      const delta = meta.lowerWins ? state.mine - mine : mine - state.mine;
      const scale = state.key === 'AVG' ? 12 : 1.2;   // put AVG on a comparable footing
      value += state.leverage * delta * scale;
    } else {
      const perGame = (p.seasonStats[state.key] ?? 0) / games;
      // Normalise so a category's typical per-game rate is order 1, otherwise
      // strikeouts would swamp steals purely by magnitude.
      const typical = state.swing / Math.max(1, state.swing) || 1;
      value += state.leverage * perGame * typical * scaleFor(state.key);
    }
  }

  return value * availability(p);
}

/** Per-game rates differ by an order of magnitude between categories. */
const SCALES: Record<string, number> = {
  R: 1, HR: 3.5, RBI: 1, SB: 3.5, W: 6, SV: 5, K: 0.35,
};
const scaleFor = (key: string) => SCALES[key] ?? 1;

export interface EngineResult {
  calls: LineupCall[];
  states: CategoryState[];
}

export function startSit(roster: Roster, matchup: Matchup | null): EngineResult {
  const states = matchup ? categoryStates(matchup, roster.players) : [];
  if (states.length === 0) return { calls: [], states };

  const active = roster.players.filter((p) => STARTING_SLOTS.includes(p.slot));
  const bench = roster.players.filter((p) => p.slot === 'BN');

  const calls: LineupCall[] = [];
  const claimed = new Set<string>();

  for (const starter of active) {
    const startedValue = weeklyValue(starter, states);

    // Only a bench player eligible at the starter's slot can replace him.
    const options = bench
      .filter((b) => !claimed.has(b.playerKey) && b.positions.includes(starter.slot))
      .map((b) => ({ player: b, value: weeklyValue(b, states) }))
      .sort((a, b) => b.value - a.value);

    const best = options[0];

    const role = roleOf(starter);

    // Relievers have no lineup status worth reporting either way.
    if (role === 'reliever') continue;

    if (starter.startingToday === false) {
      if (role === 'batter') {
        if (best) claimed.add(best.player.playerKey);
        calls.push({
          playerKey: starter.playerKey,
          recommendation: 'sit',
          reason: best
            ? `Scratched from tonight's lineup — the slot scores nothing. ${best.player.name} is available at ${starter.slot}.`
            : `Scratched from tonight's lineup — the slot scores nothing, and no bench player covers ${starter.slot}.`,
          confidence: best ? 0.95 : 0.8,
        });
        continue;
      }

      // A starting pitcher who is not pitching is unremarkable. Only worth
      // raising if a bench arm actually takes the ball today.
      const pitchingToday = options.find((o) => o.player.startingToday === true);
      if (pitchingToday) {
        claimed.add(pitchingToday.player.playerKey);
        calls.push({
          playerKey: pitchingToday.player.playerKey,
          recommendation: 'start',
          reason: `${pitchingToday.player.name} takes the ball today; ${starter.name} does not pitch. A start is a start.`,
          confidence: 0.75,
        });
      }
      continue;
    }

    // Only a batter has a lineup card to wait on.
    if (starter.startingToday === null && role === 'batter') {
      calls.push({
        playerKey: starter.playerKey,
        recommendation: 'hold',
        reason: `Lineup not posted yet. Unposted is not benched — check again before lock.`,
        confidence: 0.4,
      });
      continue;
    }
    if (starter.startingToday === null) continue;

    // A recommendation needs to be worth making. Below this, it is noise.
    if (best && startedValue > 0 && best.value > startedValue * 1.15 && best.value - startedValue > 0.15) {
      claimed.add(best.player.playerKey);
      const gain = describeGain(best.player, starter, states);
      calls.push({
        playerKey: best.player.playerKey,
        recommendation: 'start',
        reason: `Better fit for what's still live this week${gain ? ` — ${gain}` : ''}. Sit ${starter.name} at ${starter.slot}.`,
        confidence: Math.min(0.9, 0.55 + (best.value - startedValue) / Math.max(best.value, 1)),
      });
    }
  }

  return { calls, states };
}

/** Name the categories driving a swap, so the call explains itself. */
function describeGain(candidate: Player, incumbent: Player, states: CategoryState[]): string {
  const games = candidate.seasonStats.G ?? 0;
  const incGames = incumbent.seasonStats.G ?? 0;
  if (games === 0 || incGames === 0) return '';

  const side = isPitcher(candidate) ? 'pitching' : 'hitting';
  const gains = liveCategories(states)
    .filter((s) => metaFor(s.key).side === side && !metaFor(s.key).rate)
    .map((s) => ({
      key: s.key,
      delta: (candidate.seasonStats[s.key] ?? 0) / games - (incumbent.seasonStats[s.key] ?? 0) / incGames,
    }))
    .filter((g) => g.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2)
    .map((g) => g.key);

  return gains.length > 0 ? `more ${gains.join(' and ')}` : '';
}
