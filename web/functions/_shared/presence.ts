/**
 * Who's been using Bunts, and whether they can be reached -- so one owner can
 * see at a glance that the other is signed in, active, and actually set up to
 * get notifications, instead of discovering it when a suggestion goes nowhere.
 *
 * Last-seen is one KV key per person (no read-modify-write races between the
 * two of you) and only rewritten when it's a couple of minutes stale: every
 * API call touches it, and KV writes are the scarce resource, not reads.
 */
import { getProfile, displayName } from './profiles';
import { listSubscriptions, type PushEnv } from './push';

const PREFIX = 'presence:';
const STALE_MS = 2 * 60_000;

export async function touch(kv: KVNamespace, email: string): Promise<void> {
  const key = PREFIX + email;
  const last = await kv.get(key);
  if (last && Date.now() - Date.parse(last) < STALE_MS) return;
  await kv.put(key, new Date().toISOString());
}

export interface PersonStatus {
  name: string;
  /** Last time their app talked to the server; null if not since presence tracking began. */
  lastSeen: string | null;
  /** When they first set up their profile (signed in and onboarded). */
  joinedAt: string | null;
  /** Phones/browsers registered for push. 0 means nothing can reach them. */
  devices: number;
  /** Whether they have suggestion alerts switched on. */
  suggestionAlerts: boolean;
}

/** Everyone except `me` who has signed in, been seen, or registered a device. */
export async function others(env: PushEnv & { BUNTS: KVNamespace }, me: string): Promise<PersonStatus[]> {
  const kv = env.BUNTS;
  const [profiles, seen, subs] = await Promise.all([
    kv.list({ prefix: 'profile:' }),
    kv.list({ prefix: PREFIX }),
    listSubscriptions(env),
  ]);
  const emails = new Set<string>([
    ...profiles.keys.map((k) => k.name.slice('profile:'.length)),
    ...seen.keys.map((k) => k.name.slice(PREFIX.length)),
    ...subs.map((s) => s.email),
  ]);
  emails.delete(me);

  return Promise.all([...emails].map(async (email) => {
    const [profile, lastSeen] = await Promise.all([getProfile(kv, email), kv.get(PREFIX + email)]);
    return {
      name: profile ? displayName(profile) : email.split('@')[0],
      lastSeen,
      joinedAt: profile?.createdAt ?? null,
      devices: subs.filter((s) => s.email === email).length,
      suggestionAlerts: profile ? profile.prefs.suggestions !== false : true,
    };
  }));
}
