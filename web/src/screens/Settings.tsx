import { useEffect, useState } from 'react';
import { Screen } from '../components';
import { api, usingMockData } from '../api';
import { APP_VERSION, RELEASES, formatDate } from '../changelog';
import { useInstall } from '../install';
import { useAsync } from '../useAsync';
import { currentSubscription, isIOS, isStandalone, subscribe, supportLevel, type PushState } from '../push';

export default function Settings() {
  return (
    <Screen title="Settings" subtitle={`Bunts ${APP_VERSION}`}>
      <SignedInAs />

      <InstallSection />

      <p className="sect">Notifications</p>
      <Notifications />

      <p className="sect">What you will get</p>
      <div className="item critical">
        <div className="item-top"><span className="pname">Player scratched</span></div>
        <p className="verdict">A rostered starter is left out of the posted lineup, with the swap to make.</p>
      </div>
      <div className="item pending">
        <div className="item-top"><span className="pname">Still unposted at lock</span></div>
        <p className="verdict">Fifteen minutes to lock and the lineup has not been published.</p>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
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
      <dl className="about">
        <dt>Version</dt><dd>{APP_VERSION}</dd>
        <dt>Data</dt><dd>{usingMockData ? 'Stand-in fixtures' : 'Yahoo Fantasy Sports API (read-only)'}</dd>
        <dt>Install</dt><dd>{isStandalone() ? 'Home screen app' : 'Browser tab'}</dd>
        <dt>Scope</dt><dd>One team, one league, one person.</dd>
      </dl>
    </Screen>
  );
}

function SignedInAs() {
  const { data } = useAsync(() => api.me());
  if (!data) return null;
  return (
    <>
      <p className="sect">Signed in</p>
      <div className="stack">
        <p className="whoami" style={{ margin: 0 }}>
          <span className="dot" style={{ background: 'var(--grass)' }} />
          <span>Suggestions you send are signed <strong>{data.name}</strong></span>
        </p>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{data.email}</p>
      </div>
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
