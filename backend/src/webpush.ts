/**
 * Web Push for Cloudflare Workers: RFC 8291 (aes128gcm) + RFC 8292 (VAPID).
 *
 * The Node `web-push` package does not run on Workers, so this is the wire
 * format built directly on WebCrypto. It was first written and verified in
 * Python against Apple's push service (see the project notes) and ported here.
 *
 * The shape of a request:
 *   Authorization: vapid t=<ES256 JWT>, k=<base64url public key>
 *   Content-Encoding: aes128gcm
 *   body = salt(16) | recordSize(4) | keyIdLen(1) | serverPublicKey(65) | ciphertext
 */

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidConfig {
  subject: string;      // mailto: or https: the push service can contact
  publicKey: string;    // base64url, raw uncompressed point (65 bytes)
  privateKey: string;   // base64url, raw scalar (32 bytes)
}

const enc = new TextEncoder();

function b64urlToBytes(s: string): Uint8Array {
  const padded = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    bytes * 8,
  );
  return new Uint8Array(bits);
}

/**
 * The VAPID private key is a raw scalar, which WebCrypto will not import
 * directly -- it wants a JWK, and the JWK needs the public coordinates too.
 * They come from the uncompressed public point: 0x04 | x(32) | y(32).
 */
async function importVapidKey(vapid: VapidConfig): Promise<CryptoKey> {
  const pub = b64urlToBytes(vapid.publicKey);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error('VAPID public key must be a 65-byte uncompressed P-256 point');
  }
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    d: vapid.privateKey,
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function vapidHeader(endpoint: string, vapid: VapidConfig): Promise<string> {
  const { origin } = new URL(endpoint);
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = {
    aud: origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: vapid.subject,
  };

  const signingInput =
    bytesToB64url(enc.encode(JSON.stringify(header))) + '.' +
    bytesToB64url(enc.encode(JSON.stringify(claims)));

  const key = await importVapidKey(vapid);
  // WebCrypto ECDSA already returns the raw r|s pair JWT wants -- no DER unwrapping.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(signingInput));

  return `vapid t=${signingInput}.${bytesToB64url(new Uint8Array(sig))}, k=${vapid.publicKey}`;
}

async function encryptPayload(plaintext: Uint8Array, sub: PushSubscription): Promise<Uint8Array> {
  const uaPublicRaw = b64urlToBytes(sub.keys.p256dh);
  const authSecret = b64urlToBytes(sub.keys.auth);

  const uaPublic = await crypto.subtle.importKey(
    'raw', uaPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );

  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  ) as CryptoKeyPair;

  // workers-types declares exportKey as returning ArrayBuffer | JsonWebKey;
  // the 'raw' format always yields the former.
  const asPublicRaw = new Uint8Array(
    (await crypto.subtle.exportKey('raw', ephemeral.publicKey)) as ArrayBuffer,
  );

  // workers-types spells the ECDH peer key '$public', but the runtime property
  // is 'public' -- writing what the runtime needs and casting the type.
  const ecdhParams = { name: 'ECDH', public: uaPublic } as unknown as SubtleCryptoDeriveKeyAlgorithm;
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(ecdhParams, ephemeral.privateKey, 256),
  );

  const prk = await hkdf(
    authSecret,
    shared,
    concat(enc.encode('WebPush: info\0'), uaPublicRaw, asPublicRaw),
    32,
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, prk, enc.encode('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 0x02 is the final-record delimiter; there is only ever one record here.
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, concat(plaintext, new Uint8Array([0x02]))),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);

  return concat(salt, recordSize, new Uint8Array([asPublicRaw.length]), asPublicRaw, ciphertext);
}

export interface SendResult {
  status: number;
  /** True when the push service says this subscription is permanently gone. */
  gone: boolean;
  error?: string;
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: unknown,
  vapid: VapidConfig,
  ttl = 600,
): Promise<SendResult> {
  const body = await encryptPayload(enc.encode(JSON.stringify(payload)), subscription);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(subscription.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
    },
    body,
  });

  // 404/410 mean the user deleted the app or the subscription expired. Anything
  // else is transient and the subscription should be kept.
  const gone = res.status === 404 || res.status === 410;
  return {
    status: res.status,
    gone,
    error: res.ok ? undefined : (await res.text().catch(() => '')).slice(0, 200),
  };
}
