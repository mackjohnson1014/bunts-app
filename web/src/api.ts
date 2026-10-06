import type {
  KeeperCandidate, LeagueTransactions, LineupCall, Matchup, OpponentDetail, PersonStatus, PlayerRef, PlayerSearchHit, Profile,
  ProfileInput,
  Roster, Suggestion, SuggestionInput, SuggestionStatus, User,
} from './types';
import { mockMatchup, mockOpponent, mockRoster, mockTransactions } from './mock';
import { mockSuggestions } from './mockSuggestions';
import { keeperTally } from './scoring/keepers';
import { startSit } from './scoring/startsit';

/**
 * The API is served from this same origin, behind Cloudflare Access. The
 * browser's Access cookie is the credential and it names the user, so there is
 * no secret to ship in the bundle and no CORS to configure.
 */
const BASE = '/api';

/** Only true when running `vite dev` with no Functions behind it. */
export const usingMockData = import.meta.env.VITE_USE_MOCKS === '1';

export class ApiError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) {
    super(message);
  }
}

/** True when the backend is fine but Yahoo data is not available yet. */
export const isWaitingOnYahoo = (e: unknown): boolean =>
  e instanceof ApiError && (e.code === 'yahoo_not_connected' || e.code === 'yahoo_not_provisioned');

/** The Access session lapsed. Only a full page load can start a new one. */
export const isSignedOut = (e: unknown): boolean =>
  e instanceof ApiError && (e.code === 'unauthenticated' || e.status === 401);

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    // The backend reports failures as {error, code?}. Surface the message, not
    // the JSON -- a user should never be shown a serialized object.
    const text = await res.text().catch(() => '');
    let message = text.slice(0, 300) || res.statusText;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(text) as { error?: string; code?: string };
      if (parsed.error) message = parsed.error;
      code = parsed.code;
    } catch {
      /* not JSON; keep the raw text */
    }
    throw new ApiError(message, code, res.status);
  }

  // A Pages SPA fallback answers /api/* with index.html when the Functions
  // were not deployed. Saying so beats "Unexpected token '<'".
  const type = res.headers.get('Content-Type') ?? '';
  if (!type.includes('json')) {
    throw new ApiError(
      `Expected JSON from ${path} but got ${type || 'no content type'} — the API is probably not deployed.`,
      'not_json',
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

const settle = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 250));

/**
 * Yahoo has approved API access but not switched it on. Until it does, the
 * backend answers with a code instead of data, and showing an empty app to
 * everyone who opens the link serves nobody. So fall back to the sample
 * dataset and mark it as such -- the moment Yahoo provisions, real data
 * arrives on its own with no toggle to remember.
 */
async function withSampleFallback<T>(fetcher: () => Promise<T>, sample: T): Promise<T> {
  try {
    return await fetcher();
  } catch (e) {
    if (isWaitingOnYahoo(e)) return sample;
    throw e;
  }
}

export const api = {
  getRoster: (): Promise<Roster> =>
    usingMockData ? settle(mockRoster) : withSampleFallback(() => req<Roster>('/roster'), mockRoster),

  getMatchup: (): Promise<Matchup> =>
    usingMockData ? settle(mockMatchup) : withSampleFallback(() => req<Matchup>('/matchup'), mockMatchup),

  /** This week's opponent: his roster, record, and our season series with him. */
  getOpponent: (): Promise<OpponentDetail> =>
    usingMockData
      ? settle(mockOpponent)
      : withSampleFallback(() => req<OpponentDetail>('/opponent'), mockOpponent),

  getTransactions: (): Promise<LeagueTransactions> =>
    usingMockData
      ? settle(mockTransactions)
      : withSampleFallback(() => req<LeagueTransactions>('/transactions'), mockTransactions),

  /**
   * Start/sit and keeper value are computed on the device from the roster and
   * the matchup rather than on the server. The inputs are already here, the
   * maths is cheap, and keeping one implementation means the recommendation
   * and the explanation behind it can never disagree.
   */
  getLineupCalls: async (): Promise<LineupCall[]> => {
    const [roster, matchup] = await Promise.all([api.getRoster(), api.getMatchup()]);
    return startSit(roster, matchup).calls;
  },

  getKeepers: async (): Promise<KeeperCandidate[]> => keeperTally(await api.getRoster()),
  saveSubscription: (sub: PushSubscriptionJSON): Promise<{ ok: true }> =>
    usingMockData
      ? settle({ ok: true as const })
      : req('/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
  sendTestPush: (): Promise<{ sent: number; dropped: number }> =>
    usingMockData ? settle({ sent: 0, dropped: 0 }) : req('/push/test', { method: 'POST' }),
  vapidPublicKey: (): Promise<{ key: string }> => {
    const baked = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (baked) return settle({ key: baked });
    return usingMockData ? settle({ key: '' }) : req('/push/key');
  },

  /** Who Access says you are, plus the profile you filled in. */
  me: (): Promise<User> =>
    usingMockData
      ? settle({ email: 'you@example.com', name: 'You', profile: null, needsOnboarding: false })
      : req('/me'),

  saveProfile: (input: ProfileInput): Promise<Profile> =>
    usingMockData
      ? settle({
          email: 'you@example.com', ...input,
          prefs: { scratched: true, unposted: true, suggestions: true, quietFrom: null, quietTo: null },
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        } as Profile)
      : req('/profile', { method: 'PUT', body: JSON.stringify(input) }),

  getSuggestions: (): Promise<Suggestion[]> =>
    usingMockData ? settle(mockSuggestions.list()) : req('/suggestions'),

  addSuggestion: (input: SuggestionInput): Promise<{ suggestion: Suggestion; notified: number; skipped?: number }> =>
    usingMockData
      ? settle({ suggestion: mockSuggestions.add(input), notified: 0, skipped: 0 })
      : req('/suggestions', { method: 'POST', body: JSON.stringify(input) }),

  /** Agree, disagree, or null to take your reaction back. */
  reactToSuggestion: (id: string, value: 'agree' | 'disagree' | null): Promise<{ suggestion: Suggestion }> =>
    usingMockData
      ? settle({ suggestion: mockSuggestions.react(id, value) })
      : req(`/suggestions/${id}/react`, { method: 'POST', body: JSON.stringify({ value }) }),

  replyToSuggestion: (id: string, text: string): Promise<{ suggestion: Suggestion }> =>
    usingMockData
      ? settle({ suggestion: mockSuggestions.reply(id, text) })
      : req(`/suggestions/${id}/reply`, { method: 'POST', body: JSON.stringify({ text }) }),

  /** Propose a different add/drop on a pickup, in the same thread. */
  counterSuggestion: (
    id: string, input: { add: PlayerRef; drop: PlayerRef | null; text: string },
  ): Promise<{ suggestion: Suggestion }> =>
    usingMockData
      ? settle({ suggestion: mockSuggestions.counter(id, input) })
      : req(`/suggestions/${id}/counter`, { method: 'POST', body: JSON.stringify(input) }),

  /** Delete one of your own suggestions. Silent: the other person isn't notified. */
  deleteSuggestion: (id: string): Promise<{ ok: true }> =>
    usingMockData
      ? settle((mockSuggestions.remove(id), { ok: true as const }))
      : req(`/suggestions/${id}`, { method: 'DELETE' }),

  /** Done (made in Yahoo), passed, or back to open. */
  resolveSuggestion: (
    id: string, status: SuggestionStatus,
  ): Promise<{ suggestion: Suggestion; notified?: number; skipped?: number }> =>
    usingMockData
      ? settle({ suggestion: mockSuggestions.resolve(id, status), notified: 0, skipped: 0 })
      : req(`/suggestions/${id}/resolve`, { method: 'POST', body: JSON.stringify({ status }) }),

  markSuggestionsSeen: (): Promise<{ ok: true }> =>
    usingMockData ? settle((mockSuggestions.seen(), { ok: true as const })) : req('/suggestions/seen', { method: 'POST' }),

  /** Active MLB players by name, for proposing a pickup. */
  searchPlayers: (q: string): Promise<PlayerSearchHit[]> =>
    usingMockData ? settle(mockSuggestions.search(q)) : req(`/players/search?q=${encodeURIComponent(q)}`),

  /** The other owner: when they were last in the app, and whether a push can reach them. */
  getPeople: (): Promise<PersonStatus[]> =>
    usingMockData
      ? settle([{
          name: 'Matt', lastSeen: new Date(Date.now() - 3 * 60_000).toISOString(),
          joinedAt: '2026-09-14T22:00:00Z', devices: 1, suggestionAlerts: true,
        }])
      : req('/people'),

  /** "Still here" while the app is open, so the other owner sees you as active. */
  heartbeat: (): Promise<{ ok: true }> =>
    usingMockData ? settle({ ok: true as const }) : req('/presence', { method: 'POST' }),
};
