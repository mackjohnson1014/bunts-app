/**
 * Suggestions: how the two co-owners talk roster moves through with each
 * other. Yahoo is read-only, so nothing here changes the team -- a suggestion
 * is a proposal one owner makes, the other reacts to or replies under, and
 * either marks done once someone has actually made the move in Yahoo.
 *
 * Three kinds, because they are the three things worth proposing:
 *   call    start / sit / keep an eye on one player
 *   swap    start A in B's place on a given day
 *   pickup  add a player (optionally dropping one) -- counts against the
 *           league's weekly add limit, so it's worth agreeing on first
 *
 * Everything lives in one KV value. It is a conversation between two people,
 * not an archive, and two writers a few times a day will not race in practice.
 */

const KEY = 'suggestions';
/** Closed ones are history; keep enough to scroll back a few weeks. Open ones are never pruned. */
const KEEP_CLOSED = 60;
const MAX_REPLIES = 60;
export const NOTE_MAX = 280;

export interface PlayerRef {
  key: string;
  name: string;
  /** MLB team abbreviation, when known. */
  team?: string;
  /** Primary position(s) for display, e.g. "SS" or "SP". */
  pos?: string;
}

export type CallKind = 'start' | 'sit' | 'watch';

export type SuggestionBody =
  | { kind: 'call'; player: PlayerRef; call: CallKind }
  | { kind: 'swap'; start: PlayerRef; bench: PlayerRef }
  | { kind: 'pickup'; add: PlayerRef; drop: PlayerRef | null };

export type SuggestionInput = SuggestionBody & {
  note: string;
  /**
   * The day a lineup call is for (YYYY-MM-DD, the author's local date). Set for
   * start/sit calls and swaps, null for watch and pickups -- those don't go
   * stale on a schedule.
   */
  date: string | null;
};

export interface Person { email: string; name: string }

export interface Reaction extends Person { value: 'agree' | 'disagree'; at: string }
export interface Reply extends Person { id: string; text: string; at: string }

export type Status = 'open' | 'done' | 'passed';
/** Status as shown: an open suggestion whose day has started is expired. */
export type State = Status | 'expired';

export interface Suggestion {
  id: string;
  body: SuggestionBody;
  note: string;
  date: string | null;
  /** First pitch on `date`; after this a lineup call is moot. */
  expiresAt: string | null;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  /** Last activity of any kind -- drives ordering and "new to you". */
  updatedAt: string;
  status: Status;
  resolvedBy: (Person & { at: string }) | null;
  reactions: Reaction[];
  replies: Reply[];
  /** Emails that have seen the latest activity. Reset to just the actor on every change. */
  seenBy: string[];
}

// ---------- validation ----------

const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

function isPlayerRef(v: unknown): v is PlayerRef {
  const p = v as PlayerRef;
  return (
    !!p && typeof p === 'object' &&
    isStr(p.key, 80) && isStr(p.name, 80) &&
    (p.team === undefined || isStr(p.team, 8)) &&
    (p.pos === undefined || isStr(p.pos, 20))
  );
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function isSuggestionInput(v: unknown): v is SuggestionInput {
  const s = v as SuggestionInput & Record<string, unknown>;
  if (!s || typeof s !== 'object') return false;
  if (typeof s.note !== 'string' || s.note.length > NOTE_MAX) return false;
  if (s.date !== null && !isDate(s.date)) return false;

  switch (s.kind) {
    case 'call':
      return isPlayerRef(s.player) && (s.call === 'start' || s.call === 'sit' || s.call === 'watch');
    case 'swap':
      return isPlayerRef(s.start) && isPlayerRef(s.bench) && s.start.key !== s.bench.key && s.date !== null;
    case 'pickup':
      return isPlayerRef(s.add) && (s.drop === null || isPlayerRef(s.drop)) && s.add.key !== s.drop?.key;
    default:
      return false;
  }
}

function bodyOf(input: SuggestionInput): SuggestionBody {
  const pick = ({ key, name, team, pos }: PlayerRef): PlayerRef => ({ key, name, team, pos });
  switch (input.kind) {
    case 'call': return { kind: 'call', player: pick(input.player), call: input.call };
    case 'swap': return { kind: 'swap', start: pick(input.start), bench: pick(input.bench) };
    case 'pickup': return { kind: 'pickup', add: pick(input.add), drop: input.drop ? pick(input.drop) : null };
  }
}

/** Whether a suggestion of this shape is tied to a day at all. */
export const isDated = (b: SuggestionBody) =>
  b.kind === 'swap' || (b.kind === 'call' && b.call !== 'watch');

// ---------- storage ----------

/**
 * The first version stored a flat {playerKey, playerName, recommendation}
 * shape with no date. Read those as calls; give start/sit ones their
 * creation day so they expire rather than sitting open forever.
 */
interface LegacySuggestion {
  id: string; authorEmail: string; authorName: string;
  playerKey: string; playerName: string; recommendation: CallKind;
  note: string; createdAt: string; seenBy: string[];
}

function upgrade(raw: Suggestion | LegacySuggestion): Suggestion {
  if ('body' in raw) return raw;
  const dated = raw.recommendation !== 'watch';
  return {
    id: raw.id,
    body: { kind: 'call', player: { key: raw.playerKey, name: raw.playerName }, call: raw.recommendation },
    note: raw.note,
    date: dated ? raw.createdAt.slice(0, 10) : null,
    expiresAt: dated ? new Date(new Date(raw.createdAt).getTime() + 24 * 3600_000).toISOString() : null,
    authorEmail: raw.authorEmail,
    authorName: raw.authorName,
    createdAt: raw.createdAt,
    updatedAt: raw.createdAt,
    status: 'open',
    resolvedBy: null,
    reactions: [],
    replies: [],
    seenBy: raw.seenBy,
  };
}

export async function listSuggestions(kv: KVNamespace): Promise<Suggestion[]> {
  const raw = await kv.get(KEY);
  const all = raw ? (JSON.parse(raw) as (Suggestion | LegacySuggestion)[]) : [];
  return all.map(upgrade);
}

export function stateOf(s: Suggestion, now = Date.now()): State {
  if (s.status !== 'open') return s.status;
  if (s.expiresAt && new Date(s.expiresAt).getTime() <= now) return 'expired';
  return 'open';
}

async function save(kv: KVNamespace, all: Suggestion[]): Promise<void> {
  const now = Date.now();
  const sorted = [...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = sorted.filter((s) => stateOf(s, now) === 'open');
  const closed = sorted.filter((s) => stateOf(s, now) !== 'open').slice(0, KEEP_CLOSED);
  const keep = new Set([...open, ...closed].map((s) => s.id));
  await kv.put(KEY, JSON.stringify(sorted.filter((s) => keep.has(s.id))));
}

export async function addSuggestion(
  kv: KVNamespace,
  input: SuggestionInput,
  author: Person,
  expiresAt: string | null,
): Promise<Suggestion> {
  const all = await listSuggestions(kv);
  const body = bodyOf(input);
  const now = new Date().toISOString();
  const dated = isDated(body);
  const suggestion: Suggestion = {
    id: crypto.randomUUID(),
    body,
    note: input.note.trim(),
    date: dated ? input.date : null,
    expiresAt: dated ? expiresAt : null,
    authorEmail: author.email,
    authorName: author.name,
    createdAt: now,
    updatedAt: now,
    status: 'open',
    resolvedBy: null,
    reactions: [],
    replies: [],
    // The author has, by definition, seen their own suggestion.
    seenBy: [author.email],
  };
  await save(kv, [suggestion, ...all]);
  return suggestion;
}

/** Apply a change to one suggestion and record it as fresh activity by `actor`. */
async function mutate(
  kv: KVNamespace,
  id: string,
  actor: Person,
  change: (s: Suggestion) => void,
): Promise<Suggestion | null> {
  const all = await listSuggestions(kv);
  const s = all.find((x) => x.id === id);
  if (!s) return null;
  change(s);
  s.updatedAt = new Date().toISOString();
  s.seenBy = [actor.email];
  await save(kv, all);
  return s;
}

export function react(kv: KVNamespace, id: string, who: Person, value: Reaction['value'] | null) {
  return mutate(kv, id, who, (s) => {
    s.reactions = s.reactions.filter((r) => r.email !== who.email);
    if (value) s.reactions.push({ ...who, value, at: new Date().toISOString() });
  });
}

export function reply(kv: KVNamespace, id: string, who: Person, text: string) {
  return mutate(kv, id, who, (s) => {
    s.replies = [...s.replies, { ...who, id: crypto.randomUUID(), text: text.trim(), at: new Date().toISOString() }]
      .slice(-MAX_REPLIES);
  });
}

export function resolve(kv: KVNamespace, id: string, who: Person, status: Status) {
  return mutate(kv, id, who, (s) => {
    s.status = status;
    s.resolvedBy = status === 'open' ? null : { ...who, at: new Date().toISOString() };
  });
}

export async function markSeen(kv: KVNamespace, email: string): Promise<void> {
  const all = await listSuggestions(kv);
  let changed = false;
  for (const s of all) {
    if (!s.seenBy.includes(email)) { s.seenBy.push(email); changed = true; }
  }
  if (changed) await kv.put(KEY, JSON.stringify(all));
}

// ---------- wording, shared by push notifications ----------

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
