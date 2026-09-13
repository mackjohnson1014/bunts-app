/* Bunts service worker.
 *
 * Its only real job is receiving push while the app is closed. On iOS this
 * only runs when the app was added to the Home Screen -- a Safari tab gets
 * no push, no matter how correct this file is.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Bunts', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Bunts';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'bunts',
    renotify: true,
    data: { url: payload.url || '/', ...(payload.data || {}) },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // If the app happens to be open, let it refresh rather than sit stale.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach((c) => c.postMessage({ type: 'push', payload }));
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = all.find((c) => c.url.includes(self.location.origin));
      if (open) {
        await open.focus();
        open.postMessage({ type: 'navigate', url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
