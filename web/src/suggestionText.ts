import type { Player, PlayerRef, Suggestion, SuggestionBody, SuggestionKind, SuggestionState } from './types';
import { STARTING_SLOTS } from './types';

/** YYYY-MM-DD in this device's time zone, `offset` days from today. */
export function localDate(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Today", "Tomorrow", "Yesterday", else "Tue Oct 6". */
export function dayWord(date: string): string {
  if (date === localDate(0)) return 'Today';
  if (date === localDate(1)) return 'Tomorrow';
  if (date === localDate(-1)) return 'Yesterday';
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Compact relative time, matching the rest of the app: "just now", "5m", "3h", "2d". */
export function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

export const KIND_LABEL: Record<SuggestionKind, string> = {
  call: 'Lineup call',
  swap: 'Lineup swap',
  pickup: 'Pickup',
};

export function headline(b: SuggestionBody): string {
  switch (b.kind) {
    case 'call':
      return `${b.call === 'start' ? 'Start' : b.call === 'sit' ? 'Sit' : 'Watch'} ${b.player.name}`;
    case 'swap':
      return `Start ${b.start.name} over ${b.bench.name}`;
    case 'pickup':
      return b.drop ? `Add ${b.add.name}, drop ${b.drop.name}` : `Add ${b.add.name}`;
  }
}

export const STATE_LABEL: Record<SuggestionState, string> = {
  open: 'Open',
  done: 'Done',
  passed: 'Passed',
  expired: 'Expired',
};

/** Card accent: amber while it wants a decision, green once made, dim otherwise. */
export function tone(s: Suggestion): 'pending' | 'ok' | 'plain' | 'critical' {
  if (s.state === 'done') return 'ok';
  if (s.state !== 'open') return 'plain';
  if (s.urgent) return 'critical';
  if (s.reactions.some((r) => r.value === 'disagree')) return 'critical';
  return 'pending';
}

/**
 * "Matt agrees" / "You disagree", or null. Only the person who didn't put
 * forward the current terms can react, so on yours it's them; on theirs, you.
 */
export function reactionLine(s: Suggestion): string | null {
  const r = s.reactions[0];
  if (!r) return null;
  const agree = r.value === 'agree';
  return s.myTerms ? `${r.name.split(' ')[0]} ${agree ? 'agrees' : 'disagrees'}` : `You ${agree ? 'agree' : 'disagree'}`;
}

export const refOf = (p: Player): PlayerRef => ({
  key: p.playerKey, name: p.name, team: p.mlbTeam || undefined, pos: p.positions[0] || undefined,
});

/** What happened to the push, in words, after sending a suggestion. */
export function deliveryLine(partner: string, notified: number, skipped = 0): string {
  if (notified > 0) return `Sent — ${partner}’s phone just buzzed.`;
  if (skipped > 0) return `Saved, but ${partner} has suggestion alerts turned off, so no notification went out.`;
  return `Saved, but ${partner} has no phone set up for alerts yet — they’ll see it next time they open Bunts.`;
}

export const isActive = (p: Player) => STARTING_SLOTS.includes(p.slot);

/** Whether an ISO timestamp falls on today's date in this device's time zone. */
export const isToday = (iso: string) => {
  const d = new Date(iso);
  return localDate(0) === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Midnight at the start of this Monday-to-Sunday fantasy week, local time. */
export function weekStart(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** The move as something that happened: "Added X, dropped Y", "Started A over B". */
export function doneLine(b: SuggestionBody): string {
  switch (b.kind) {
    case 'call':
      return b.call === 'start' ? `Started ${b.player.name}`
        : b.call === 'sit' ? `Sat ${b.player.name}`
        : `Watching ${b.player.name}`;
    case 'swap':
      return `Started ${b.start.name} over ${b.bench.name}`;
    case 'pickup':
      return b.drop ? `Added ${b.add.name}, dropped ${b.drop.name}` : `Added ${b.add.name}`;
  }
}

/** Countdown callouts start this long before the affected game. */
export const CALLOUT_MS = 2 * 3600_000;

/**
 * "Decision needed · game starts in 1h 12m" for an open lineup call whose game
 * is within two hours. 'soon' inside the last 20 minutes (when the warning push
 * goes out), 'due' before that. Null for pickups, closed ones, or unknown games.
 */
export function gameCallout(s: Suggestion, now = Date.now()): { text: string; level: 'due' | 'soon' } | null {
  if (s.state !== 'open' || !s.gameAt) return null;
  const ms = Date.parse(s.gameAt) - now;
  if (ms <= 0 || ms > CALLOUT_MS) return null;
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  const left = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
  return { text: `Decision needed · game starts in ${left}`, level: mins <= 20 ? 'soon' : 'due' };
}

/** Open ones in the order they need attention: urgent, then soonest game, then latest activity. */
export function byAttention(a: Suggestion, b: Suggestion): number {
  if (!!a.urgent !== !!b.urgent) return a.urgent ? -1 : 1;
  const ga = a.gameAt ? Date.parse(a.gameAt) : Infinity;
  const gb = b.gameAt ? Date.parse(b.gameAt) : Infinity;
  if (ga !== gb) return ga - gb;
  return b.updatedAt.localeCompare(a.updatedAt);
}
