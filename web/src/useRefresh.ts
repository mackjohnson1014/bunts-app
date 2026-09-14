import { useCallback, useEffect, useState } from 'react';

declare const __BUILD_ID__: string;

/**
 * Two different kinds of staleness, which are easy to conflate:
 *
 *  - stale DATA: the roster was fetched an hour ago.
 *  - stale CODE: a new version was deployed and this install is still running
 *    the old one. iOS keeps a home-screen app suspended in memory, so
 *    reopening it from the app switcher does not reload anything.
 *
 * The first is fixed by refetching, the second only by reloading the document.
 */

const STALE_AFTER_MS = 60_000;

/** Fires whenever the app comes back to the foreground after being away a while. */
export function useRefreshOnFocus(reload: () => void) {
  useEffect(() => {
    let hiddenAt: number | null = null;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt > STALE_AFTER_MS) reload();
      hiddenAt = null;
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [reload]);
}

/** True once a newer build than the running one is live. */
export function useUpdateAvailable(): { available: boolean; apply: () => void } {
  const [available, setAvailable] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/version.json', { cache: 'no-store' });
      if (!res.ok) return;
      const { buildId } = (await res.json()) as { buildId?: string };
      if (buildId && buildId !== __BUILD_ID__) setAvailable(true);
    } catch {
      /* offline, or the file is not deployed yet; nothing to do */
    }
  }, []);

  useEffect(() => {
    void check();
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(() => void check(), 10 * 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, [check]);

  const apply = useCallback(() => {
    // Drop the service worker's cached document too, or the reload can serve
    // exactly the version we are trying to escape.
    void (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* caches API unavailable; the reload alone is usually enough */
      }
      location.reload();
    })();
  }, []);

  return { available, apply };
}
