import { sendWebPush, type PushSubscription, type VapidConfig } from './webpush';

const KEY_SUBS = 'push:subscriptions';

/** A subscription belongs to a person, so one of you can be notified and not the other. */
export interface StoredSubscription extends PushSubscription {
  email: string;
  addedAt: string;
}

export interface PushEnv {
  BUNTS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

export function vapidFrom(env: PushEnv): VapidConfig {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys are not configured. See PUSH_SETUP.md.');
  }
  return {
    subject: env.VAPID_SUBJECT || 'mailto:nobody@example.com',
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
}

export async function listSubscriptions(env: PushEnv): Promise<StoredSubscription[]> {
  const raw = await env.BUNTS.get(KEY_SUBS);
  return raw ? (JSON.parse(raw) as StoredSubscription[]) : [];
}

export async function addSubscription(env: PushEnv, sub: PushSubscription, email: string): Promise<void> {
  const subs = await listSubscriptions(env);
  const next = subs.filter((s) => s.endpoint !== sub.endpoint);
  next.push({ ...sub, email, addedAt: new Date().toISOString() });
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
 * Deliver to registered devices, dropping the ones the push service says are
 * permanently gone. `exceptEmail` is how a suggestion notifies the co-owner
 * without buzzing the phone of the person who just wrote it.
 */
export async function notify(
  env: PushEnv,
  notification: Notification,
  opts: { exceptEmail?: string; onlyEmail?: string } = {},
): Promise<{ sent: number; dropped: number }> {
  const all = await listSubscriptions(env);
  const targets = all.filter((s) => {
    if (opts.onlyEmail && s.email !== opts.onlyEmail) return false;
    if (opts.exceptEmail && s.email === opts.exceptEmail) return false;
    return true;
  });
  if (targets.length === 0) return { sent: 0, dropped: 0 };

  const vapid = vapidFrom(env);
  const results = await Promise.all(
    targets.map(async (sub) => ({ sub, result: await sendWebPush(sub, notification, vapid) })),
  );

  const goneEndpoints = new Set(results.filter((r) => r.result.gone).map((r) => r.sub.endpoint));
  if (goneEndpoints.size > 0) {
    await env.BUNTS.put(KEY_SUBS, JSON.stringify(all.filter((s) => !goneEndpoints.has(s.endpoint))));
  }
  for (const r of results) {
    if (!r.result.gone && r.result.status >= 400) {
      console.error('push failed', r.result.status, r.result.error);
    }
  }

  return { sent: results.filter((r) => r.result.status < 400).length, dropped: goneEndpoints.size };
}
