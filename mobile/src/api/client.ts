import Constants from 'expo-constants';
import type { KeeperCandidate, LineupCall, Roster } from '../types';
import { mockKeepers, mockLineupCalls, mockRoster } from './mock';

/**
 * Base URL of the Bunts backend (the Cloudflare Worker).
 * Set EXPO_PUBLIC_BUNTS_API in .env to switch off mock data.
 * While it is unset the app runs entirely on the fixtures in ./mock.ts.
 */
const BASE = process.env.EXPO_PUBLIC_BUNTS_API ?? '';
const SECRET = process.env.EXPO_PUBLIC_BUNTS_SECRET ?? '';

export const usingMockData = BASE === '';

class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

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
    const body = await res.text().catch(() => '');
    throw new ApiError(body.slice(0, 300) || res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}

// Small delay on the mock path so loading states are actually exercised in dev.
const settle = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 350));

export const api = {
  getRoster(): Promise<Roster> {
    return usingMockData ? settle(mockRoster) : req<Roster>('/roster');
  },
  getLineupCalls(): Promise<LineupCall[]> {
    return usingMockData ? settle(mockLineupCalls) : req<LineupCall[]>('/lineup');
  },
  getKeepers(): Promise<KeeperCandidate[]> {
    return usingMockData ? settle(mockKeepers) : req<KeeperCandidate[]>('/keepers');
  },
  /** Hand the backend this device's Expo push token so it can reach us. */
  registerPushToken(token: string): Promise<{ ok: true }> {
    if (usingMockData) return settle({ ok: true as const });
    return req<{ ok: true }>('/push/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Constants.platform?.ios ? 'ios' : 'android' }),
    });
  },
};

export { ApiError };
