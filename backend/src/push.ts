import { sendWebPush, type PushSubscription, type VapidConfig } from './webpush';
import type { Env } from './yahoo';

const KEY_SUBS = 'push:subscriptions';

export function vapidFrom(env: Env): VapidConfig {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys are not configured. See PUSH_SETUP.md.');
  }
  return {
    subject: env.VAPID_SUBJECT || 'mailto:nobody@example.com',
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
}

export async function listSubscriptions(env: Env): Promise<PushSubscription[]> {
  const raw = await env.BUNTS.get(KEY_SUBS);
  return raw ? (JSON.parse(raw) as PushSubscription[]) : [];
}

export async function addSubscription(env: Env, sub: PushSubscription): Promise<void> {
  const subs = await listSubscriptions(env);
  // Re-subscribing produces the same endpoint, so replace rather than duplicate.
  const next = subs.filter((s) => s.endpoint !== sub.endpoint);
  next.push(sub);
  await env.BUNTS.put(KEY_SUBS, JSON.stringify(next));
}

export interface Notification {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  data?: unknown;
}

/**
 * Deliver to every registered device, dropping the ones the push service says
 * are permanently gone. A dead subscription otherwise gets retried on every
 * poll forever.
 */
export async function notify(env: Env, notification: Notification): Promise<{ sent: number; dropped: number }> {
  const subs = await listSubscriptions(env);
  if (subs.length === 0) return { sent: 0, dropped: 0 };

  const vapid = vapidFrom(env);
  const results = await Promise.all(
    subs.map(async (sub) => ({ sub, result: await sendWebPush(sub, notification, vapid) })),
  );

  const alive = results.filter((r) => !r.result.gone).map((r) => r.sub);
  const dropped = results.length - alive.length;
  if (dropped > 0) await env.BUNTS.put(KEY_SUBS, JSON.stringify(alive));

  for (const r of results) {
    if (!r.result.gone && r.result.status >= 400) {
      console.error('push failed', r.result.status, r.result.error);
    }
  }

  return { sent: results.filter((r) => r.result.status < 400).length, dropped };
}
