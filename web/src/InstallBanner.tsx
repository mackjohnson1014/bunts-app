import { useState } from 'react';
import { useInstall } from './install';

/**
 * One-time nudge to install. Hidden once the app is running from the home
 * screen, and dismissible for anyone who would rather not. Settings keeps a
 * permanent copy, so dismissing loses nothing.
 */
export function InstallBanner() {
  const { installed, dismissed, canPrompt, steps, platform, install, dismiss } = useInstall();
  const [open, setOpen] = useState(false);

  if (installed || dismissed) return null;

  return (
    <aside className="install">
      <div className="install-head">
        <button
          className="install-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="install-steps"
        >
          <span className="install-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
          Add Bunts to your home screen
        </button>
        <button className="install-close" onClick={dismiss} aria-label="Dismiss install instructions">×</button>
      </div>

      {open ? (
        <div id="install-steps">
          <p className="install-why">
            Installed, Bunts opens like an app and can send you notifications.
            {platform === 'ios' ? ' In a Safari tab it cannot.' : ''}
          </p>

          {canPrompt ? (
            <button className="btn" onClick={() => void install()}>Install Bunts</button>
          ) : (
            <ol className="steps">
              {steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          )}
        </div>
      ) : null}
    </aside>
  );
}
