import type { KeeperCandidate, LineupCall, Roster } from './types';
import { mockKeepers, mockLineupCalls, mockRoster } from './mock';

const BASE = import.meta.env.VITE_BUNTS_API ?? '';
const SECRET = import.meta.env.VITE_BUNTS_SECRET ?? '';

export const usingMockData = BASE === '';

export class ApiError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) {
    super(message);
  }
}

/** True when the backend is fine but Yahoo data is not available yet. */
export const isWaitingOnYahoo = (e: unknown): boolean =>
  e instanceof ApiError && (e.code === 'yahoo_not_connected' || e.code === 'yahoo_not_provisioned');

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(SECRET ? { Authorization: `Bearer ${SECRET}` } : {}),
      ...(init?.headers ?? {}),
    },
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
  getLineupCalls: (): Promise<LineupCall[]> =>
    usingMockData ? settle(mockLineupCalls) : withSampleFallback(() => req<LineupCall[]>('/lineup'), mockLineupCalls),
  getKeepers: (): Promise<KeeperCandidate[]> =>
    usingMockData ? settle(mockKeepers) : withSampleFallback(() => req<KeeperCandidate[]>('/keepers'), mockKeepers),
  saveSubscription: (sub: PushSubscriptionJSON): Promise<{ ok: true }> =>
    usingMockData
      ? settle({ ok: true as const })
      : req('/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
  sendTestPush: (): Promise<{ sent: number; dropped: number }> =>
    usingMockData ? settle({ sent: 0, dropped: 0 }) : req('/push/test', { method: 'POST' }),
  /**
   * The backend publishes this once deployed. VITE_VAPID_PUBLIC_KEY lets the
   * app subscribe before that exists, which is how push gets tested first.
   */
  vapidPublicKey: (): Promise<{ key: string }> => {
    const baked = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (baked) return settle({ key: baked });
    return usingMockData ? settle({ key: '' }) : req('/push/key');
  },
};
