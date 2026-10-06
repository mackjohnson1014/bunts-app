import type {
  PlayerRef, PlayerSearchHit, Suggestion, SuggestionInput, SuggestionStatus,
} from './types';
import { localDate } from './suggestionText';

/**
 * An in-memory stand-in for /api/suggestions, for the sample-data preview
 * only. It lets the whole conversation be clicked through -- send, agree,
 * reply, mark done -- without touching KV or anyone's phone. Resets on reload.
 */

const ME = { email: 'you@example.com', name: 'You' };
const PARTNER = { email: 'matt@example.com', name: 'Matt' };

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
const inMins = (mins: number) => new Date(Date.now() + mins * 60_000).toISOString();

type Stored = Omit<Suggestion, 'state' | 'mine' | 'myTerms' | 'unread'>;

let store: Stored[] = [
  {
    id: 'mock-1',
    body: {
      kind: 'pickup',
      add: { key: 'p.201', name: 'Devon Ackley', team: 'TB', pos: 'SP' },
      drop: { key: 'p.26', name: 'Dane Kirilenko', team: 'ATL', pos: 'RP' },
    },
    note: 'Two starts next week and we’re short on innings. Kirilenko hasn’t pitched in five days.',
    date: null,
    expiresAt: null,
    authorEmail: PARTNER.email, authorName: PARTNER.name,
    createdAt: ago(95), updatedAt: ago(40),
    status: 'open', resolvedBy: null,
    reactions: [],
    replies: [
      { ...PARTNER, id: 'r1', text: 'Waiver clears tonight so we’d have him for both.', at: ago(40) },
    ],
    seenBy: [PARTNER.email],
  },
  {
    id: 'mock-2',
    body: {
      kind: 'swap',
      start: { key: 'p.12', name: 'Owen Brandt', team: 'BOS', pos: '1B' },
      bench: { key: 'p.3', name: 'Devon Marsh', team: 'CHC', pos: '2B' },
    },
    note: 'Marsh is day-to-day and Brandt’s 9 for 22 off lefties.',
    date: localDate(0),
    expiresAt: inMins(75),
    gameAt: inMins(75),
    urgent: true,
    authorEmail: ME.email, authorName: ME.name,
    createdAt: ago(130), updatedAt: ago(70),
    status: 'open', resolvedBy: null,
    reactions: [{ ...PARTNER, value: 'agree', at: ago(70) }],
    replies: [],
    seenBy: [PARTNER.email],
  },
  {
    id: 'mock-3',
    body: { kind: 'call', player: { key: 'p.25', name: 'Theo Brannigan', team: 'CLE', pos: 'OF' }, call: 'watch' },
    note: 'Leading off the last three games. If it sticks he’s worth a spot.',
    date: null,
    expiresAt: null,
    authorEmail: PARTNER.email, authorName: PARTNER.name,
    createdAt: ago(60 * 26), updatedAt: ago(60 * 26),
    status: 'open', resolvedBy: null,
    reactions: [{ ...ME, value: 'agree', at: ago(60 * 25) }],
    replies: [],
    seenBy: [PARTNER.email, ME.email],
  },
  {
    id: 'mock-4',
    body: {
      kind: 'pickup',
      add: { key: 'p.198', name: 'Yusniel Marte', team: 'MIA', pos: 'OF' },
      drop: { key: 'p.20', name: 'Phil Ostrander', team: 'DET', pos: 'C' },
    },
    note: '',
    date: null,
    expiresAt: null,
    authorEmail: ME.email, authorName: ME.name,
    // Made today, so the preview's Home card shows a "Made today" log.
    createdAt: ago(60 * 5), updatedAt: ago(25),
    status: 'done', resolvedBy: { ...PARTNER, at: ago(25) },
    reactions: [{ ...PARTNER, value: 'agree', at: ago(60 * 4) }],
    replies: [],
    seenBy: [PARTNER.email, ME.email],
  },
  {
    id: 'mock-6',
    body: {
      kind: 'pickup',
      add: { key: 'p.303', name: 'Trey Loman', team: 'COL', pos: 'RP' },
      drop: { key: 'p.22', name: 'Ray Lindquist', team: 'PIT', pos: 'RP' },
    },
    note: 'Loman’s closing while their guy is hurt.',
    date: null,
    expiresAt: null,
    authorEmail: PARTNER.email, authorName: PARTNER.name,
    createdAt: ago(60 * 3), updatedAt: ago(15),
    status: 'passed', resolvedBy: { ...ME, at: ago(15) },
    reactions: [{ ...ME, value: 'disagree', at: ago(60 * 2) }],
    replies: [{ ...ME, id: 'r3', text: 'Their closer is back Friday. Not worth an add.', at: ago(60 * 2) }],
    seenBy: [PARTNER.email, ME.email],
  },
  {
    id: 'mock-5',
    body: { kind: 'call', player: { key: 'p.9', name: 'Kenji Mori', team: 'CLE', pos: 'SP' }, call: 'sit' },
    note: 'At Coors.',
    date: localDate(-2),
    expiresAt: ago(60 * 40),
    authorEmail: PARTNER.email, authorName: PARTNER.name,
    createdAt: ago(60 * 54), updatedAt: ago(60 * 54),
    status: 'open', resolvedBy: null,
    reactions: [{ ...ME, value: 'disagree', at: ago(60 * 53) }],
    replies: [{ ...ME, id: 'r2', text: 'We need the Ks more than the ratios this week.', at: ago(60 * 53) }],
    seenBy: [PARTNER.email, ME.email],
  },
];

const view = (s: Stored): Suggestion => ({
  ...s,
  state:
    s.status !== 'open' ? s.status
    : s.expiresAt && Date.parse(s.expiresAt) <= Date.now() ? 'expired'
    : 'open',
  mine: s.authorEmail === ME.email,
  myTerms: (s.termsBy?.email ?? s.authorEmail) === ME.email,
  unread: !s.seenBy.includes(ME.email),
});

function touch(id: string, change: (s: Stored) => void): Suggestion {
  const s = store.find((x) => x.id === id);
  if (!s) throw new Error('not found');
  change(s);
  s.updatedAt = new Date().toISOString();
  s.seenBy = [ME.email];
  return view(s);
}

function mockDeadline(date: string): string {
  const seven = new Date(`${date}T19:00:00`);
  if (seven.getTime() > Date.now()) return seven.toISOString();
  const next = new Date(`${date}T04:00:00`);
  next.setDate(next.getDate() + 1);
  return next.toISOString();
}

const FREE_AGENTS: PlayerSearchHit[] = [
  { key: 'p.301', name: 'Casey Nakamura', team: 'SEA', pos: 'SS' },
  { key: 'p.302', name: 'Julian Vance', team: 'OAK', pos: 'OF' },
  { key: 'p.303', name: 'Trey Loman', team: 'COL', pos: 'RP' },
  { key: 'p.304', name: 'Marco Diehl', team: 'NYM', pos: 'SP' },
  { key: 'p.305', name: 'Reid Colton', team: 'TOR', pos: '2B' },
  { key: 'p.306', name: 'Sam Iturbe', team: 'HOU', pos: 'C' },
];

export const mockSuggestions = {
  list: (): Suggestion[] =>
    [...store].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(view),

  add(input: SuggestionInput): Suggestion {
    const { note, date, urgent: _urgent, ...body } = input;
    const now = new Date().toISOString();
    const s: Stored = {
      id: `mock-${Date.now()}`, body, note: note.trim(), date,
      // Preview approximation of the server: a 7 p.m. local first pitch on the
      // chosen day, or 4 a.m. the next morning once that's passed.
      expiresAt: date ? mockDeadline(date) : null,
      gameAt: date ? mockDeadline(date) : null,
      urgent: input.urgent === true,
      authorEmail: ME.email, authorName: ME.name, createdAt: now, updatedAt: now,
      status: 'open', resolvedBy: null, reactions: [], replies: [], seenBy: [ME.email],
    };
    store = [s, ...store];
    return view(s);
  },

  react: (id: string, value: 'agree' | 'disagree' | null) =>
    touch(id, (s) => {
      s.reactions = s.reactions.filter((r) => r.email !== ME.email);
      if (value) s.reactions.push({ ...ME, value, at: new Date().toISOString() });
    }),

  reply: (id: string, text: string) =>
    touch(id, (s) => {
      s.replies = [...s.replies, { ...ME, id: `r-${Date.now()}`, text: text.trim(), at: new Date().toISOString() }];
    }),

  counter: (id: string, input: { add: PlayerRef; drop: PlayerRef | null; text: string }) =>
    touch(id, (s) => {
      const to = { kind: 'pickup' as const, add: input.add, drop: input.drop };
      s.replies = [...s.replies, {
        ...ME, id: `r-${Date.now()}`, text: input.text.trim(), at: new Date().toISOString(),
        counter: { from: s.body, to },
      }];
      s.body = to;
      s.termsBy = ME;
      s.reactions = [];
    }),

  resolve: (id: string, status: SuggestionStatus) =>
    touch(id, (s) => {
      s.status = status;
      s.resolvedBy = status === 'open' ? null : { ...ME, at: new Date().toISOString() };
    }),

  urgent: (id: string, value: boolean) => touch(id, (s) => { s.urgent = value; }),

  remove(id: string) {
    store = store.filter((s) => s.id !== id);
  },

  seen() {
    for (const s of store) if (!s.seenBy.includes(ME.email)) s.seenBy.push(ME.email);
  },

  search: (q: string): PlayerSearchHit[] => {
    const needle = q.trim().toLowerCase();
    return needle.length < 2 ? [] : FREE_AGENTS.filter((p) => p.name.toLowerCase().includes(needle));
  },
};
