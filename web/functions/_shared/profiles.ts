/**
 * Who each signed-in person is, and how they want to be bothered.
 *
 * Access supplies a verified email; it does not supply a name, and guessing one
 * from the local part gets you "Mack Johnson1014". Preferences live here rather
 * than on the device so they follow you to a second phone, and so the server
 * can honour them when deciding whom to push.
 */

export const ALERT_KINDS = ['scratched', 'unposted', 'suggestions'] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface Prefs extends Record<AlertKind, boolean> {
  scratched: boolean;
  unposted: boolean;
  suggestions: boolean;
  /** Local hours, inclusive start, exclusive end. Null when not set. */
  quietFrom: number | null;
  quietTo: number | null;
}

export interface Profile {
  email: string;
  firstName: string;
  lastName: string;
  prefs: Prefs;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PREFS: Prefs = {
  scratched: true,
  unposted: true,
  suggestions: true,
  quietFrom: null,
  quietTo: null,
};

const key = (email: string) => `profile:${email.toLowerCase()}`;

export const displayName = (p: Profile) => `${p.firstName} ${p.lastName}`.trim();

export async function getProfile(kv: KVNamespace, email: string): Promise<Profile | null> {
  const raw = await kv.get(key(email));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Profile;
  // Older records predate later preference keys; fill the gaps rather than
  // letting an undefined read as "off".
  parsed.prefs = { ...DEFAULT_PREFS, ...parsed.prefs };
  return parsed;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  prefs?: Partial<Prefs>;
}

export function isProfileInput(v: unknown): v is ProfileInput {
  const p = v as ProfileInput;
  if (!p || typeof p.firstName !== 'string' || typeof p.lastName !== 'string') return false;
  if (p.firstName.trim().length === 0 || p.firstName.length > 40) return false;
  if (p.lastName.length > 40) return false;
  if (p.prefs !== undefined && (typeof p.prefs !== 'object' || p.prefs === null)) return false;
  return true;
}

export async function saveProfile(kv: KVNamespace, email: string, input: ProfileInput): Promise<Profile> {
  const existing = await getProfile(kv, email);
  const now = new Date().toISOString();
  const profile: Profile = {
    email: email.toLowerCase(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    prefs: { ...DEFAULT_PREFS, ...existing?.prefs, ...input.prefs },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await kv.put(key(email), JSON.stringify(profile));
  return profile;
}

/** True when this person wants this kind of alert, right now. */
export function wants(profile: Profile | null, kind: AlertKind, at = new Date()): boolean {
  // No profile yet means they have not onboarded; default to sending rather
  // than silently swallowing the alerts they signed up for.
  if (!profile) return true;
  if (!profile.prefs[kind]) return false;

  const { quietFrom, quietTo } = profile.prefs;
  if (quietFrom === null || quietTo === null || quietFrom === quietTo) return true;

  const hour = at.getHours();
  const quiet = quietFrom < quietTo
    ? hour >= quietFrom && hour < quietTo
    : hour >= quietFrom || hour < quietTo;   // window crosses midnight
  return !quiet;
}
