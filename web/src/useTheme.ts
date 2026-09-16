import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'bunts-theme';

/**
 * Light is the default for anyone who has never chosen -- keep this in sync
 * with the inline bootstrap script in index.html, which applies the same
 * default before first paint so there is no flash of the other theme.
 */
const DEFAULT_THEME: Theme = 'light';

const THEME_COLOR: Record<Theme, string> = { light: '#F5F4ED', dark: '#101A13' };

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage can throw in private browsing / disabled-storage contexts --
    // fall through to the default rather than crash the app over a theme.
  }
  return DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

/**
 * Backs the Settings -> Appearance toggle. The `<html data-theme>` attribute
 * this sets is what styles.css keys its light-theme token overrides off of
 * (`:root[data-theme="light"]`) -- every component already reads the same
 * `--board`/`--amber`/etc. variable names, so nothing else has to change per
 * theme.
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // Idempotent with the inline bootstrap script's default, and keeps the
  // theme-color meta tag correct even when this hook mounts after load
  // (e.g. opening Settings -> Appearance well into the session).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Best-effort persistence; the in-memory state still drives this session.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
