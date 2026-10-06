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
  if (s.reactions.some((r) => r.value === 'disagree')) return 'critical';
  return 'pending';
}

/**
 * "Matt agrees" / "You disagree", or null. Only the person who didn't write it
 * can react, so on your own suggestion it's them; on theirs, it's you.
 */
export function reactionLine(s: Suggestion): string | null {
  const r = s.reactions[0];
  if (!r) return null;
  const agree = r.value === 'agree';
  return s.mine ? `${r.name} ${agree ? 'agrees' : 'disagrees'}` : `You ${agree ? 'agree' : 'disagree'}`;
}

export const refOf = (p: Player): PlayerRef => ({
  key: p.playerKey, name: p.name, team: p.mlbTeam, pos: p.positions[0],
});

export const isActive = (p: Player) => STARTING_SLOTS.includes(p.slot);
