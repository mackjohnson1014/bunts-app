import type { KeeperCandidate, LineupCall, Roster } from './types';
import { mockKeepers, mockLineupCalls, mockRoster } from './mock';

const BASE = import.meta.env.VITE_BUNTS_API ?? '';
const SECRET = import.meta.env.VITE_BUNTS_SECRET ?? '';

export const usingMockData = BASE === '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(SECRET ? { Authorization: `Bearer ${SECRET}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')).slice(0, 300) || res.statusText);
  return res.json() as Promise<T>;
}

const settle = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 250));

export const api = {
  getRoster: (): Promise<Roster> => (usingMockData ? settle(mockRoster) : req('/roster')),
  getLineupCalls: (): Promise<LineupCall[]> => (usingMockData ? settle(mockLineupCalls) : req('/lineup')),
  getKeepers: (): Promise<KeeperCandidate[]> => (usingMockData ? settle(mockKeepers) : req('/keepers')),
  saveSubscription: (sub: PushSubscriptionJSON): Promise<{ ok: true }> =>
    usingMockData
      ? settle({ ok: true as const })
      : req('/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
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
