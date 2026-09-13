import { api } from './api';

/**
 * Web Push on iOS, which is fussier than anywhere else:
 *
 *  - iOS 16.4+ only.
 *  - The app must have been added to the Home Screen and opened from that icon.
 *    The identical URL in a Safari tab gets no push, and the APIs are simply
 *    absent there, so feature detection alone misdiagnoses it.
 *  - The permission prompt must come from a user gesture.
 *
 * Each of those failures is reported separately below, because "notifications
 * didn't work" is useless and "you're in a Safari tab, open it from the icon"
 * is actionable.
 */

export type PushState =
  | 'ready'           // subscribed, backend has us
  | 'idle'            // supported, not subscribed yet
  | 'needs-install'   // iOS, running in a browser tab
  | 'unsupported'     // no service worker / push support at all
  | 'denied'
  | 'no-key'          // backend has not published a VAPID key
  | 'error';

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS exposes this non-standard flag instead of display-mode.
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function supportLevel(): PushState {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'denied') return 'denied';
  return 'idle';
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

/**
 * VAPID keys travel as base64url; PushManager wants raw bytes.
 * Backed by an explicit ArrayBuffer so the result is `Uint8Array<ArrayBuffer>`
 * rather than `Uint8Array<ArrayBufferLike>`, which BufferSource rejects.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribe(): Promise<{
  state: PushState;
  detail?: string;
  endpoint?: string;
  subscription?: PushSubscriptionJSON;
}> {
  const level = supportLevel();
  if (level !== 'idle') return { state: level };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { state: 'denied' };

  const reg = await registerServiceWorker();
  if (!reg) return { state: 'error', detail: 'Service worker failed to register.' };
  await navigator.serviceWorker.ready;

  let key = '';
  try {
    key = (await api.vapidPublicKey()).key;
  } catch (e) {
    return { state: 'error', detail: e instanceof Error ? e.message : String(e) };
  }
  if (!key) {
    return {
      state: 'no-key',
      detail: 'The backend has not published a VAPID key yet, so there is nothing to subscribe to.',
    };
  }

  try {
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      }));
    const json = sub.toJSON();
    await api.saveSubscription(json);
    return { state: 'ready', endpoint: sub.endpoint, subscription: json };
  } catch (e) {
    return { state: 'error', detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}
