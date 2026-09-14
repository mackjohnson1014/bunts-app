import { useState } from 'react';
import { api } from './api';
import { isIOS, isStandalone, subscribe, supportLevel, type PushState } from './push';
import { ALERT_KINDS, type AlertKind, type Prefs, type User } from './types';

const ALERT_COPY: Record<AlertKind, { title: string; detail: string }> = {
  scratched: {
    title: 'Player scratched',
    detail: 'Someone in your lineup is left out of the posted card.',
  },
  unposted: {
    title: 'Lineup still unposted',
    detail: 'Fifteen minutes to lock with no card published.',
  },
  suggestions: {
    title: 'Suggestions from your co-owner',
    detail: 'They flag a player and tell you why.',
  },
};

const STEPS = ['Name', 'Alerts', 'This device'] as const;

/**
 * Shown once, after Access has already established who you are. Not a second
 * login -- it asks the two things Access cannot tell us (what to call you, and
 * which alerts you want) plus the one thing only the device can grant.
 *
 * One question per screen: the single-page version put a name field, three
 * toggles and a permission explanation in one scroll, and read as a form to
 * endure rather than three quick answers.
 */
export function Onboarding({ user, onDone }: { user: User; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [prefs, setPrefs] = useState<Pick<Prefs, AlertKind>>({
    scratched: true, unposted: true, suggestions: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameReady = firstName.trim().length > 0;

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      await api.saveProfile({ firstName, lastName, prefs });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setSaving(false);
  }

  return (
    <div className="onboard">
      <header className="onboard-top">
        <p className="onboard-eyebrow">Bunts · {user.email}</p>
        <div className="stepbar" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          {STEPS.map((label, i) => (
            <span key={label} className={`stepseg${i <= step ? ' done' : ''}`} />
          ))}
        </div>
        <p className="stepcount">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
      </header>

      <div className="onboard-body">
       <div className="onboard-step">
        {step === 0 ? (
          <>
            <h1 className="onboard-title">What should we call you?</h1>
            <p className="onboard-lede">
              This goes on every suggestion you send, so your co-owner knows who
              is telling them to bench someone.
            </p>
            <div className="name-row" style={{ marginTop: 20 }}>
              <label className="field">
                <span>First</span>
                <input
                  id="onboard-first" className="note-input" value={firstName}
                  maxLength={40} autoComplete="given-name" autoFocus
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Last</span>
                <input
                  id="onboard-last" className="note-input" value={lastName}
                  maxLength={40} autoComplete="family-name"
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h1 className="onboard-title">What should buzz your phone?</h1>
            <p className="onboard-lede">
              Your choices, not your co-owner's — you each set your own. All of
              it is changeable later, along with quiet hours.
            </p>
            <div style={{ marginTop: 16 }}>
              {ALERT_KINDS.map((kind) => (
                <div className="toggle" key={kind}>
                  <div className="toggle-text">
                    <div className="t">{ALERT_COPY[kind].title}</div>
                    <div className="d">{ALERT_COPY[kind].detail}</div>
                  </div>
                  <button
                    className="sw"
                    aria-pressed={prefs[kind]}
                    aria-label={ALERT_COPY[kind].title}
                    onClick={() => setPrefs((p) => ({ ...p, [kind]: !p[kind] }))}
                  />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {step === 2 ? <DeviceStep onDone={onDone} /> : null}

        {error ? <p className="muted" style={{ color: 'var(--clay)', marginTop: 14 }}>{error}</p> : null}
       </div>
      </div>

      {step < 2 ? (
        <footer className="onboard-foot">
          {/* Rendered unconditionally so the buttons below never shift. */}
          <p className="foot-hint">
            {step === 0 && !nameReady ? 'A first name is enough.' : '\u00A0'}
          </p>
          <div className="foot-buttons">
            {step > 0 ? (
              <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>
            ) : null}
            <button
              className="btn"
              disabled={(step === 0 && !nameReady) || saving}
              onClick={() => (step === 0 ? setStep(1) : void saveProfile())}
            >
              {saving ? 'Saving…' : step === 0 ? 'Continue' : 'Save and continue'}
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

/**
 * The permission itself, which is the step most likely to be skipped and the
 * one that makes every earlier answer matter.
 */
function DeviceStep({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<PushState>(supportLevel);
  const [working, setWorking] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  async function enable() {
    setWorking(true);
    const result = await subscribe();
    setState(result.state);
    setDetail(result.detail ?? null);
    setWorking(false);
  }

  const done = state === 'ready';

  return (
    <>
      <h1 className="onboard-title">
        {done ? "You're all set" : 'Turn on notifications'}
      </h1>

      {done ? (
        <p className="onboard-lede">
          This device is registered. Alerts will arrive even when Bunts is closed.
        </p>
      ) : state === 'needs-install' ? (
        <>
          <p className="onboard-lede">
            {isIOS() && !isStandalone()
              ? 'iOS only delivers notifications to a home-screen app. Bunts is running in a browser tab right now.'
              : 'Add Bunts to your home screen first.'}
          </p>
          <ol className="steps" style={{ marginTop: 14 }}>
            <li>Tap the <b>Share</b> button in Safari</li>
            <li>Choose <b>Add to Home Screen</b></li>
            <li>Open Bunts from the new <b>icon</b></li>
            <li>Come back here and turn alerts on</li>
          </ol>
        </>
      ) : state === 'denied' ? (
        <p className="onboard-lede">
          Notifications are blocked for Bunts. Turn them back on in Settings →
          Notifications → Bunts, then reopen the app.
        </p>
      ) : (
        <p className="onboard-lede">
          Your phone will ask permission. Without it Bunts can still show you the
          roster, but nothing will reach you when the app is closed — which is
          the point of the alerts you just chose.
        </p>
      )}

      {detail ? <p className="muted" style={{ marginTop: 12 }}>{detail}</p> : null}

      <div className="onboard-actions">
        {!done && state !== 'needs-install' && state !== 'denied' ? (
          <button className="btn" onClick={enable} disabled={working}>
            {working ? 'Working…' : 'Allow notifications'}
          </button>
        ) : null}
        <button className={done ? 'btn' : 'btn ghost'} onClick={onDone}>
          {done ? 'Open Bunts' : 'Skip for now'}
        </button>
      </div>
    </>
  );
}
