import type { Env } from './yahoo';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const KEY_DEVICES = 'push:devices';

export interface Device {
  token: string;
  platform: string;
  registeredAt: string;
}

export async function listDevices(env: Env): Promise<Device[]> {
  const raw = await env.BUNTS.get(KEY_DEVICES);
  return raw ? (JSON.parse(raw) as Device[]) : [];
}

export async function registerDevice(env: Env, token: string, platform: string): Promise<void> {
  const devices = await listDevices(env);
  const without = devices.filter((d) => d.token !== token);
  without.push({ token, platform, registeredAt: new Date().toISOString() });
  await env.BUNTS.put(KEY_DEVICES, JSON.stringify(without));
}

export async function sendPush(env: Env, title: string, body: string, data?: unknown): Promise<number> {
  const devices = await listDevices(env);
  if (devices.length === 0) return 0;

  const messages = devices.map((d) => ({
    to: d.token,
    title,
    body,
    sound: 'default',
    channelId: 'lineups',
    data,
  }));

  const res = await fetch(EXPO_PUSH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    throw new Error(`Expo push failed: ${res.status} ${await res.text()}`);
  }

  // Expo reports per-message errors in the body even on a 200. A DeviceNotRegistered
  // ticket means that install is gone -- drop it so we stop paying for it every poll.
  const out = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
  const dead = new Set<string>();
  out.data?.forEach((ticket, i) => {
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      dead.add(devices[i].token);
    }
  });
  if (dead.size > 0) {
    await env.BUNTS.put(KEY_DEVICES, JSON.stringify(devices.filter((d) => !dead.has(d.token))));
  }

  return messages.length - dead.size;
}
