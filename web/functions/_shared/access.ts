/**
 * Identity from Cloudflare Access.
 *
 * Access terminates at the edge and injects a signed JWT naming the user. The
 * signature is verified rather than trusted: if the app is ever served from a
 * path Access does not cover, an unverified header would let anyone claim to be
 * anyone by setting it themselves.
 *
 * Keys come from the team's public certs endpoint and are cached in memory for
 * the isolate's life -- they rotate rarely, and a fetch per request would put
 * a network round trip in front of everything.
 */

interface Jwk {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

export interface Identity {
  email: string;
  /** Display name derived from the email local part, title-cased. */
  name: string;
}

let cachedKeys: { at: number; keys: Map<string, CryptoKey> } | null = null;
const KEY_TTL_MS = 60 * 60 * 1000;

function b64urlToBytes(s: string): Uint8Array {
  const padded = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function publicKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
  if (cachedKeys && Date.now() - cachedKeys.at < KEY_TTL_MS) return cachedKeys.keys;

  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs unavailable: ${res.status}`);
  const { keys } = (await res.json()) as { keys: Jwk[] };

  const map = new Map<string, CryptoKey>();
  for (const jwk of keys) {
    if (jwk.kty !== 'RSA') continue;
    map.set(
      jwk.kid,
      await crypto.subtle.importKey(
        'jwk',
        { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      ),
    );
  }
  cachedKeys = { at: Date.now(), keys: map };
  return map;
}

const titleCase = (s: string) =>
  s.replace(/[._-]+/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase()).trim();

/**
 * Returns the authenticated user, or null when no valid assertion is present.
 * `aud` is checked against the Access application's AUD tag so a token minted
 * for some other application on the same team cannot be replayed here.
 */
export async function identify(req: Request, teamDomain: string, aud: string): Promise<Identity | null> {
  const token =
    req.headers.get('Cf-Access-Jwt-Assertion') ??
    (req.headers.get('Cookie') ?? '').match(/CF_Authorization=([^;]+)/)?.[1];
  if (!token || !teamDomain || !aud) return null;

  const [headerB64, payloadB64, sigB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !sigB64) return null;

  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(headerB64))) as { kid?: string; alg?: string };
    if (header.alg !== 'RS256' || !header.kid) return null;

    const key = (await publicKeys(teamDomain)).get(header.kid);
    if (!key) return null;

    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlToBytes(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    if (!ok) return null;

    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64))) as {
      email?: string; exp?: number; aud?: string | string[];
    };

    if (!claims.email) return null;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;

    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(aud)) return null;

    return { email: claims.email.toLowerCase(), name: titleCase(claims.email.split('@')[0]) };
  } catch {
    return null;
  }
}
