import { useCallback, useEffect, useState } from 'react';
import { isStandalone } from './push';

/**
 * Install guidance, which is annoyingly platform-specific:
 *
 *  - Android/Chrome fires `beforeinstallprompt`, so we can offer a real button
 *    that opens the native install dialog. Instructions are the fallback.
 *  - iOS/Safari fires nothing and exposes no install API. Manual steps only,
 *    and the Share sheet is the only route.
 *  - Desktop Chrome behaves like Android; other desktop browsers vary.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'desktop';

const DISMISS_KEY = 'bunts:install-dismissed';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export const INSTALL_STEPS: Record<Platform, string[]> = {
  android: [
    'Tap the ⋮ menu in Chrome, top right',
    'Choose Install app — or Add to Home screen on older versions',
    'Confirm, then open Bunts from the new icon',
  ],
  ios: [
    'Tap the Share button in Safari, the square with an arrow',
    'Scroll down and choose Add to Home Screen',
    'Tap Add, then open Bunts from the new icon',
  ],
  desktop: [
    'Click the install icon in the address bar, or the ⋮ menu',
    'Choose Install Bunts',
  ],
};

/** localStorage can throw in private windows; a banner is not worth a crash. */
const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const writeDismissed = () => {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
};

export const clearDismissed = () => {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
};

export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [installed, setInstalled] = useState(isStandalone);
  const platform = detectPlatform();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Chrome shows its own mini-infobar unless this is prevented; we want the
      // install to happen from our button, in our layout.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === 'accepted';
  }, [deferred]);

  const dismiss = useCallback(() => {
    writeDismissed();
    setDismissed(true);
  }, []);

  const restore = useCallback(() => {
    clearDismissed();
    setDismissed(false);
  }, []);

  return {
    platform,
    installed,
    dismissed,
    canPrompt: deferred !== null,
    steps: INSTALL_STEPS[platform],
    install,
    dismiss,
    restore,
  };
}
