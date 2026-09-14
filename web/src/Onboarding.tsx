import { useState } from 'react';
import { api } from './api';
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

/**
 * Shown once, after Access has already established who you are. It is not a
 * second login -- it asks the two things Access cannot tell us: what to call
 * you, and which alerts you actually want.
 */
export function Onboarding({ user, onDone }: { user: User; onDone: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [prefs, setPrefs] = useState<Pick<Prefs, AlertKind>>({
    scratched: true, unposted: true, suggestions: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = firstName.trim().length > 0;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.saveProfile({ firstName, lastName, prefs });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div className="onboard">
      <div className="onboard-inner">
        <p className="onboard-eyebrow">Signed in as {user.email}</p>
        <h1 className="onboard-title">Welcome to Bunts</h1>
        <p className="onboard-lede">
          Two things before you start. Your name goes on the suggestions you send
          your co-owner, so they know who is telling them to bench someone.
        </p>

        <p className="sect">Your name</p>
        <div className="name-row">
          <label className="field">
            <span>First</span>
            <input
              id="onboard-first"
              className="note-input"
              value={firstName}
              maxLength={40}
              autoComplete="given-name"
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Last</span>
            <input
              id="onboard-last"
              className="note-input"
              value={lastName}
              maxLength={40}
              autoComplete="family-name"
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>

        <p className="sect">What should buzz your phone</p>
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
        <p className="muted" style={{ marginTop: 10 }}>
          All of this is changeable later in Settings, including quiet hours.
          You will still need to allow notifications on this device — Settings
          walks you through it.
        </p>

        {error ? <p className="muted" style={{ color: 'var(--clay)' }}>{error}</p> : null}

        <button className="btn" onClick={save} disabled={!ready || saving}>
          {saving ? 'Saving…' : 'Get started'}
        </button>
        {!ready ? <p className="muted" style={{ marginTop: 8 }}>A first name is enough.</p> : null}
      </div>
    </div>
  );
}
