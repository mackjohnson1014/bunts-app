import { useEffect, useState } from 'react';
import { Screen } from '../components';
import { api, usingMockData } from '../api';
import { currentSubscription, isIOS, isStandalone, subscribe, supportLevel, type PushState } from '../push';

export default function Alerts() {
  const [state, setState] = useState<PushState>('idle');
  const [detail, setDetail] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [registered, setRegistered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  /**
   * A subscription living in the browser does not mean the backend knows about
   * it -- the two can drift whenever the backend is deployed after the device
   * subscribed. So re-send it on every load; /push/subscribe replaces by
   * endpoint, so this is idempotent.
   */
  useEffect(() => {
    setState(supportLevel());
    void (async () => {
      const sub = await currentSubscription();
      if (!sub) return;
      setState('ready');
      setSubscription(sub.toJSON());
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
    setSubscription(result.subscription ?? null);
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

  const showEnable = state !== 'ready' && state !== 'needs-install' && state !== 'unsupported' && state !== 'denied';

  return (
    <Screen title="Alerts" subtitle="Get told when a rostered player is scratched">
      <div className="stack">
        <div className="status-row">
          <span className="dot" style={{ background: dotColor(state, registered) }} />
          <strong>{label(state, registered)}</strong>
        </div>

        {detail ? <p className="muted" style={{ marginBottom: 0 }}>{detail}</p> : null}

        {state === 'needs-install' ? <InstallSteps /> : null}

        {showEnable ? (
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

        {subscription && usingMockData ? (
          <>
            <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
              No backend configured, so nothing received this. Copy it if you need to
              send a notification by hand.
            </p>
            <p className="endpoint">{JSON.stringify(subscription)}</p>
            <button
              className="btn ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(subscription));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? 'Copied' : 'Copy subscription'}
            </button>
          </>
        ) : null}
      </div>

      <p className="sect">What you will get</p>
      <div className="item critical">
        <div className="item-top"><span className="pname">Player scratched</span></div>
        <p className="verdict">A rostered starter is left out of the posted lineup, with the swap to make.</p>
      </div>
      <div className="item pending">
        <div className="item-top"><span className="pname">Still unposted at lock</span></div>
        <p className="verdict">Fifteen minutes to lock and the lineup has not been published.</p>
      </div>

      <p className="muted" style={{ marginTop: 14 }}>
        Bunts cannot fix a lineup for you — Yahoo grants read access only. Every
        alert ends with you making the swap in the Yahoo app.
      </p>
    </Screen>
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
