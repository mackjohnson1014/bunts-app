import { useEffect, useState } from 'react';
import { Screen } from '../components';
import { api, usingMockData } from '../api';
import { APP_VERSION, RELEASES, formatDate } from '../changelog';
import { useInstall } from '../install';
import { ALERT_KINDS, type AlertKind, type Prefs, type User } from '../types';
import { currentSubscription, isIOS, isStandalone, subscribe, supportLevel, type PushState } from '../push';

export default function Settings({
  user, onProfileChange, onReplayOnboarding,
}: {
  user: User | null;
  onProfileChange: () => void;
  onReplayOnboarding: () => void;
}) {
  return (
    <Screen title="Settings" subtitle={`Bunts ${APP_VERSION}`}>
      <YouSection user={user} onChange={onProfileChange} />

      <InstallSection />

      <p className="sect">Notifications</p>
      <Notifications />

      <p className="muted" style={{ marginTop: 12 }}>
        Bunts cannot fix a lineup for you — Yahoo grants read access only. Every
        alert ends with you making the swap in the Yahoo app.
      </p>

      <p className="sect">What's new</p>
      {RELEASES.map((r, i) => (
        <div className={`release${i === 0 ? '' : ' old'}`} key={r.version}>
          <div className="release-head">
            <span className="release-version">{r.version}</span>
            <span className="release-title">{r.title}</span>
            <span className="release-date">{formatDate(r.date)}</span>
          </div>
          <ul>
            {r.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      ))}

      <p className="sect">About</p>
      <div className="stack" style={{ marginBottom: 8 }}>
        <button className="btn ghost" onClick={onReplayOnboarding}>
          Run through setup again
        </button>
      </div>
      <dl className="about">
        <dt>Version</dt><dd>{APP_VERSION}</dd>
        <dt>Data</dt><dd>{usingMockData ? 'Stand-in fixtures' : 'Yahoo Fantasy Sports API (read-only)'}</dd>
        <dt>Install</dt><dd>{isStandalone() ? 'Home screen app' : 'Browser tab'}</dd>
        <dt>Scope</dt><dd>One team, one league, one person.</dd>
      </dl>
    </Screen>
  );
}

const ALERT_COPY: Record<AlertKind, { title: string; detail: string }> = {
  scratched: { title: 'Player scratched', detail: 'Someone active is left out of the posted lineup.' },
  unposted: { title: 'Lineup still unposted', detail: 'Fifteen minutes to lock with no card published.' },
  suggestions: { title: 'Suggestions from your co-owner', detail: 'They flag a player and tell you why.' },
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) =>
  h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;

/**
 * Name and alert preferences. Saves are optimistic on the toggles -- a switch
 * that waits for a round trip before moving feels broken on a phone.
 */
function YouSection({ user, onChange }: { user: User | null; onChange: () => void }) {
  const profile = user?.profile ?? null;
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [prefs, setPrefs] = useState<Prefs | null>(profile?.prefs ?? null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPrefs(profile.prefs);
  }, [profile?.updatedAt]);

  if (!user) {
    return (
      <>
        <p className="sect">Signed in</p>
        <div className="stack">
          <p className="whoami" style={{ margin: 0 }}>
            <span className="dot" style={{ background: 'var(--clay)' }} />
            <span>Bunts cannot tell who you are</span>
          </p>
        </div>
      </>
    );
  }

  const dirty =
    firstName !== (profile?.firstName ?? '') || lastName !== (profile?.lastName ?? '');

  async function save(next?: Partial<Prefs>) {
    const merged = next && prefs ? { ...prefs, ...next } : prefs ?? undefined;
    if (next && prefs) setPrefs({ ...prefs, ...next });   // optimistic
    try {
      await api.saveProfile({ firstName, lastName, prefs: merged });
      setStatus('Saved');
      setTimeout(() => setStatus(null), 1500);
      onChange();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
      onChange();   // pull back whatever the server actually has
    }
  }

  return (
    <>
      <p className="sect">You</p>
      <div className="stack">
        <p className="whoami" style={{ margin: 0 }}>
          <span className="dot" style={{ background: 'var(--grass)' }} />
          <span>Suggestions are signed <strong>{user.name}</strong></span>
        </p>
        <p className="muted" style={{ marginTop: 6, marginBottom: 10 }}>{user.email}</p>

        <div className="name-row">
          <label className="field">
            <span>First</span>
            <input
              id="settings-first" className="note-input" value={firstName}
              maxLength={40} autoComplete="given-name"
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Last</span>
            <input
              id="settings-last" className="note-input" value={lastName}
              maxLength={40} autoComplete="family-name"
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>
        {dirty ? (
          <button className="btn" onClick={() => void save()} disabled={firstName.trim().length === 0}>
            Save name
          </button>
        ) : null}
        {status ? <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{status}</p> : null}
      </div>

      {prefs ? (
        <>
          <p className="sect">Alerts you want</p>
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
                onClick={() => void save({ [kind]: !prefs[kind] } as Partial<Prefs>)}
              />
            </div>
          ))}

          <p className="sect">Quiet hours</p>
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              Alerts in this window are dropped, not queued — a scratch you learn
              about at 2 AM is not worth waking up for.
            </p>
            <div className="name-row" style={{ marginTop: 10 }}>
              <label className="field">
                <span>From</span>
                <select
                  id="quiet-from" className="note-input"
                  value={prefs.quietFrom ?? ''}
                  onChange={(e) => void save({ quietFrom: e.target.value === '' ? null : Number(e.target.value) })}
                >
                  <option value="">Off</option>
                  {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </select>
              </label>
              <label className="field">
                <span>To</span>
                <select
                  id="quiet-to" className="note-input"
                  value={prefs.quietTo ?? ''}
                  onChange={(e) => void save({ quietTo: e.target.value === '' ? null : Number(e.target.value) })}
                >
                  <option value="">Off</option>
                  {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </select>
              </label>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

/**
 * The banner is dismissible, so Settings keeps a permanent copy -- dismissing
 * the nudge should not cost someone the instructions.
 */
function InstallSection() {
  const { installed, canPrompt, steps, platform, install, dismissed, restore } = useInstall();

  if (installed) return null;

  return (
    <>
      <p className="sect">Install</p>
      <div className="stack">
        <p style={{ margin: 0 }}>
          Bunts is running in a browser tab. Installed to the home screen it opens
          like an app{platform === 'ios' ? ' and can send notifications, which a tab cannot' : ''}.
        </p>
        {canPrompt ? (
          <button className="btn" onClick={() => void install()}>Install Bunts</button>
        ) : (
          <ol className="steps">
            {steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        )}
        {dismissed ? (
          <button className="btn ghost" onClick={restore}>Show the reminder again</button>
        ) : null}
      </div>
    </>
  );
}

function Notifications() {
  const [state, setState] = useState<PushState>('idle');
  const [detail, setDetail] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [working, setWorking] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  /**
   * A subscription living in the browser does not mean the backend knows about
   * it -- the two drift whenever the backend is deployed after the device
   * subscribed. Re-send on every load; /push/subscribe replaces by endpoint,
   * so this is idempotent.
   */
  useEffect(() => {
    setState(supportLevel());
    void (async () => {
      const sub = await currentSubscription();
      if (!sub) return;
      setState('ready');
      if (usingMockData) return;
      try {
        await api.saveSubscription(sub.toJSON());
        setRegistered(true);
      } catch (e) {
        setDetail(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  async function enable() {
    setWorking(true);
    setDetail(null);
    const result = await subscribe();
    setState(result.state);
    setDetail(result.detail ?? null);
    setRegistered(result.state === 'ready' && !usingMockData);
    setWorking(false);
  }

  async function sendTest() {
    setWorking(true);
    setTestResult(null);
    try {
      const res = await api.sendTestPush();
      setTestResult(
        res.sent > 0
          ? `Sent to ${res.sent} device${res.sent === 1 ? '' : 's'}.`
          : 'The backend has no devices registered.',
      );
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : String(e));
    }
    setWorking(false);
  }

  const canEnable = state === 'idle' || state === 'error' || state === 'no-key';

  return (
    <div className="stack">
      <div className="status-row">
        <span className="dot" style={{ background: dotColor(state, registered) }} />
        <strong>{label(state, registered)}</strong>
      </div>

      {detail ? <p className="muted" style={{ marginBottom: 0 }}>{detail}</p> : null}
      {state === 'needs-install' ? <InstallSteps /> : null}

      {canEnable ? (
        <button className="btn" onClick={enable} disabled={working}>
          {working ? 'Working…' : 'Enable alerts'}
        </button>
      ) : null}

      {state === 'ready' && !usingMockData ? (
        <>
          <button className="btn" onClick={sendTest} disabled={working}>
            {working ? 'Sending…' : 'Send a test notification'}
          </button>
          <button className="btn ghost" onClick={enable} disabled={working}>
            Re-register this device
          </button>
          {testResult ? <p className="muted" style={{ marginBottom: 0 }}>{testResult}</p> : null}
        </>
      ) : null}

      {state === 'denied' ? (
        <p className="muted">
          Turn notifications back on in Settings → Notifications → Bunts, then reopen the app.
        </p>
      ) : null}
    </div>
  );
}

function InstallSteps() {
  return (
    <>
      <p className="muted" style={{ marginTop: 8 }}>
        {isIOS() && !isStandalone()
          ? 'iOS only delivers push to a home-screen app. This is running in a browser tab.'
          : 'Add this to your home screen to enable notifications.'}
      </p>
      <ol className="steps">
        <li>Tap the <b>Share</b> button in Safari</li>
        <li>Choose <b>Add to Home Screen</b></li>
        <li>Open Bunts from the new <b>icon</b>, not from Safari</li>
        <li>Come back here and tap Enable alerts</li>
      </ol>
    </>
  );
}

const label = (s: PushState, registered: boolean) => {
  if (s === 'ready') return registered ? 'Alerts are on, backend has this device' : 'Subscribed on this device';
  return {
    idle: 'Not enabled yet',
    'needs-install': 'Add to home screen first',
    unsupported: 'This browser cannot receive push',
    denied: 'Notifications are blocked',
    'no-key': 'Backend not ready',
    error: 'Something went wrong',
    ready: '',
  }[s];
};

const dotColor = (s: PushState, registered: boolean) =>
  s === 'ready' && registered ? 'var(--grass)'
  : s === 'denied' || s === 'error' || s === 'unsupported' ? 'var(--clay)'
  : 'var(--amber)';
