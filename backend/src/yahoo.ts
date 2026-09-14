/**
 * Yahoo Fantasy read client.
 *
 * The single thing that matters here: Yahoo may hand back a NEW refresh token
 * on any refresh, and the old one stops working. Persist what comes back, every
 * time. An integration that ignores this works for weeks and then dies without
 * warning.
 */

export interface Env {
  BUNTS: KVNamespace;
  YAHOO_CLIENT_ID: string;
  YAHOO_CLIENT_SECRET: string;
  /** Seed value; after the first refresh the live one lives in KV. */
  YAHOO_REFRESH_TOKEN: string;
  LEAGUE_KEY: string;
  TEAM_KEY: string;
  /** Web Push (VAPID). Public key is served to the app; private key signs. */
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

const TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';
const API = 'https://fantasysports.yahooapis.com/fantasy/v2';

const KEY_ACCESS = 'yahoo:access';
const KEY_REFRESH = 'yahoo:refresh';

interface CachedAccess {
  token: string;
  expiresAt: number;
}

async function currentRefreshToken(env: Env): Promise<string> {
  return (await env.BUNTS.get(KEY_REFRESH)) ?? env.YAHOO_REFRESH_TOKEN;
}

async function refreshAccess(env: Env): Promise<string> {
  const refresh = await currentRefreshToken(env);
  const body = new URLSearchParams({
    client_id: env.YAHOO_CLIENT_ID,
    client_secret: env.YAHOO_CLIENT_SECRET,
    redirect_uri: 'oob',
    refresh_token: refresh,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${env.YAHOO_CLIENT_ID}:${env.YAHOO_CLIENT_SECRET}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Yahoo token refresh failed: ${res.status} ${await res.text()}`);
  }

  const tok = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  // Rotation: if Yahoo issued a new refresh token, the old one is now dead.
  if (tok.refresh_token && tok.refresh_token !== refresh) {
    await env.BUNTS.put(KEY_REFRESH, tok.refresh_token);
  }

  const cached: CachedAccess = {
    token: tok.access_token,
    expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000 - 60_000,
  };
  await env.BUNTS.put(KEY_ACCESS, JSON.stringify(cached));
  return cached.token;
}

export async function accessToken(env: Env): Promise<string> {
  const raw = await env.BUNTS.get(KEY_ACCESS);
  if (raw) {
    const cached = JSON.parse(raw) as CachedAccess;
    if (cached.expiresAt > Date.now()) return cached.token;
  }
  return refreshAccess(env);
}

/** GET a Fantasy API path, e.g. `team/${teamKey}/roster`. */
export async function yahooGet<T = unknown>(env: Env, path: string): Promise<T> {
  const url = `${API}/${path}${path.includes('?') ? '&' : '?'}format=json`;

  const attempt = async (token: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  let res = await attempt(await accessToken(env));

  // A 401 can mean an expired token OR a missing permission. Retry once with a
  // forced refresh; if it still fails, surface the body so the cause is visible.
  if (res.status === 401) {
    res = await attempt(await refreshAccess(env));
  }

  if (!res.ok) {
    const body = await res.text();
    if (body.includes('additional_authorization_required')) {
      throw new Error('Yahoo has not provisioned Fantasy API access for this app yet.');
    }
    throw new Error(`Yahoo ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }

  return (await res.json()) as T;
}
