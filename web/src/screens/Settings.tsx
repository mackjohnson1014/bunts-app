import { useEffect, useState, type ReactNode } from 'react';
import { Screen } from '../components';
import { api, usingMockData } from '../api';
import { APP_VERSION, RELEASES, formatDate } from '../changelog';
import { useInstall } from '../install';
import { ALERT_KINDS, type AlertKind, type Prefs, type User } from '../types';
import { currentSubscription, isIOS, isStandalone, subscribe, supportLevel, type PushState } from '../push';
import { useTheme } from '../useTheme';

type SectionId = 'account' | 'appearance' | 'alerts' | 'changelog' | 'about';

const SECTIONS: { id: SectionId; label: string; Icon: (props: { className?: string }) => ReactNode }[] = [
  { id: 'account', label: 'My Account', Icon: AccountIcon },
  { id: 'appearance', label: 'Appearance', Icon: AppearanceIcon },
  { id: 'alerts', label: 'Alerts & Notifications', Icon: AlertsIcon },
  { id: 'changelog', label: 'Changelog', Icon: ChangelogIcon },
  { id: 'about', label: 'About', Icon: AboutIcon },
];

/**
 * Drawn rather than pulled from an icon library -- same approach as Logo.tsx.
 * Plain stroke glyphs, sized to sit in a row next to a chevron; color comes
 * from the wrapping .set-row-icon so light/active states stay in one place.
 */
function AccountIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17c0-3.6 2.7-6.2 6-6.2s6 2.6 6 6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Half-filled circle -- the day/night split, same stroke-first style as the others. */
function AppearanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor" />
    </svg>
  );
}

function AlertsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 8.4a4 4 0 0 1 8 0v3l1.3 2.1H4.7L6 11.4v-3z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M8.2 15.3a1.8 1.8 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChangelogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 6.5h10M5 10h10M5 13.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AboutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9.3v4.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.6" r="0.95" fill="currentColor" />
    </svg>
  );
}

function sectionFromHash(): SectionId | null {
  const m = /^#settings\/(account|appearance|alerts|changelog|about)$/.exec(location.hash);
  return m ? (m[1] as SectionId) : null;
}

/**
 * Settings is a two-pane router, not one long scroll: a list of links up
 * front, and a full-screen section that slides in from the right when one is
 * picked -- same idea as iOS Settings. The current section lives in the URL
 * hash (#settings/<id>) so the phone's back button and a reload both land in
 * the right place, matching how App.tsx seeds the initial tab from the hash.
 */
export default function Settings({
  user, onProfileChange, onReplayOnboarding,
}: {
  user: User | null;
  onProfileChange: () => void;
  onReplayOnboarding: () => void;
}) {
  const [section, setSection] = useState<SectionId | null>(sectionFromHash);
  // Kept one step behind `section` so the outgoing pane still has content to
  // show while it slides off, instead of going blank mid-transition.
  const [lastSection, setLastSection] = useState<SectionId>(section ?? 'account');

  useEffect(() => {
    const onHash = () => setSection(sectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (section) setLastSection(section);
  }, [section]);

  // Tagging the pushed entry lets close() tell "we navigated here, so
  // history.back() lands somewhere sane" apart from "this section came from
  // a deep link / reload, so the previous entry is outside the app" -- in
  // the second case, going back should just drop the hash, not risk
  // navigating the PWA away entirely.
  function open(id: SectionId) {
    history.pushState({ buntsSettings: true }, '', `#settings/${id}`);
    setSection(id);
  }

  function close() {
    if ((history.state as { buntsSettings?: boolean } | null)?.buntsSettings) {
      history.back();
    } else if (location.hash) {
      location.hash = '';
      setSection(null);
    } else {
      setSection(null);
    }
  }

  return (
    <div className="settings-router">
      <div className={`settings-track${section ? ' is-detail' : ''}`}>
        <div className="settings-pane" inert={!!section}>
          <Screen title="Settings" subtitle={`Unruly Bunts ${APP_VERSION}`}>
            <SettingsList onOpen={open} />
          </Screen>
        </div>
        <div className="settings-pane" inert={!section}>
          {lastSection === 'account' && (
            <AccountPane user={user} onChange={onProfileChange} onBack={close} />
          )}
          {lastSection === 'appearance' && <AppearancePane onBack={close} />}
          {lastSection === 'alerts' && (
            <AlertsPane user={user} onChange={onProfileChange} onBack={close} />
          )}
          {lastSection === 'changelog' && <ChangelogPane onBack={close} />}
          {lastSection === 'about' && (
            <AboutPane onReplayOnboarding={onReplayOnboarding} onBack={close} />
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsList({ onOpen }: { onOpen: (id: SectionId) => void }) {
  return (
    <div className="set-list">
      {SECTIONS.map((s) => (
        <button key={s.id} className="set-row" onClick={() => onOpen(s.id)}>
          <span className="set-row-left">
            <s.Icon className="set-row-icon" />
            <span className="set-row-label">{s.label}</span>
          </span>
          <span className="chevron" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  );
}

const ALERT_COPY: Record<AlertKind, { title: string; detail: string }> = {
  scratched: { title: 'Player scratched', detail: 'Someone active is left out of the posted lineup.' },
  unposted: { title: 'Lineup still unposted', detail: 'Fifteen minutes to lock with no card published.' },
  suggestions: { title: 'Suggestions from your co-owner', detail: 'They flag a player and tell you why.' },
  transactions: { title: "Opponent's transactions", detail: 'Your weekly opponent adds or drops a player.' },
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) =>
  h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;

/**
 * Identity only -- name and who suggestions are signed as. Alert preferences
 * moved to AlertsPane; this pane no longer touches `prefs` at all, so saving
 * a name here can never clobber an alert toggle someone changed elsewhere.
 */
function AccountPane({
  user, onChange, onBack,
}: {
  user: User | null;
  onChange: () => void;
  onBack: () => void;
}) {
  const profile = user?.profile ?? null;
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
  }, [profile?.updatedAt]);

  if (!user) {
    return (
      <Screen title="My Account" onBack={onBack}>
        <p className="sect">Signed in</p>
        <div className="stack">
          <p className="whoami" style={{ margin: 0 }}>
            <span className="dot" style={{ background: 'var(--clay)' }} />
            <span>Bunts cannot tell who you are</span>
          </p>
        </div>
      </Screen>
    );
  }

  const dirty =
    firstName !== (profile?.firstName ?? '') || lastName !== (profile?.lastName ?? '');

  async function save() {
    try {
      await api.saveProfile({ firstName, lastName, prefs: profile?.prefs ?? undefined });
      setStatus('Saved');
      setTimeout(() => setStatus(null), 1500);
      onChange();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
      onChange();   // pull back whatever the server actually has
    }
  }

  return (
    <Screen title="My Account" onBack={onBack}>
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
    </Screen>
  );
}

/**
 * One toggle: the app's own light/dark choice, independent of the OS theme
 * (the app never followed prefers-color-scheme even before this existed).
 * Persisted client-side only -- useTheme.ts -- there is nothing to sync
 * server-side about how someone likes their own screen to look.
 */
function AppearancePane({ onBack }: { onBack: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <Screen title="Appearance" onBack={onBack}>
      <p className="sect">Display</p>
      <div className="toggle">
        <div className="toggle-text">
          <div className="t">Dark Mode</div>
          <div className="d">
            Scoreboard-at-night palette. Off shows the paper/day palette instead.
          </div>
        </div>
        <button
          className="sw"
          aria-pressed={theme === 'dark'}
          aria-label="Dark Mode"
          onClick={toggle}
        />
      </div>
    </Screen>
  );
}

/**
 * Everything about being told something: push registration, which alerts are
 * on, and quiet hours. Toggle/quiet-hour saves send the name fields straight
 * from `user.profile` (never a local draft), since this pane never edits
 * them -- whatever is already saved server-side is what should stay saved.
 */
function AlertsPane({
  user, onChange, onBack,
}: {
  user: User | null;
  onChange: () => void;
  onBack: () => void;
}) {
  const profile = user?.profile ?? null;
  const [prefs, setPrefs] = useState<Prefs | null>(profile?.prefs ?? null);

  useEffect(() => {
    if (!profile) return;
    setPrefs(profile.prefs);
  }, [profile?.updatedAt]);

  async function save(next: Partial<Prefs>) {
    if (!profile || !prefs) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged);   // optimistic
    try {
      await api.saveProfile({ firstName: profile.firstName, lastName: profile.lastName, prefs: merged });
      onChange();
    } catch {
      onChange();   // pull back whatever the server actually has
    }
  }

  return (
    <Screen title="Alerts & Notifications" onBack={onBack}>
      <InstallSection />

      <p className="sect">Notifications</p>
      <Notifications />

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

      <p className="muted" style={{ marginTop: 12 }}>
        Bunts cannot fix a lineup for you — Yahoo grants read access only. Every
        alert ends with you making the swap in the Yahoo app.
      </p>
    </Screen>
  );
}

function ChangelogPane({ onBack }: { onBack: () => void }) {
  return (
    <Screen title="Changelog" onBack={onBack}>
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
    </Screen>
  );
}

function AboutPane({
  onReplayOnboarding, onBack,
}: {
  onReplayOnboarding: () => void;
  onBack: () => void;
}) {
  return (
    <Screen title="About" onBack={onBack}>
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
