import { useEffect, useState } from 'react';
import { Screen } from '../components';
import { usingMockData } from '../api';
import { currentSubscription, isIOS, isStandalone, subscribe, supportLevel, type PushState } from '../push';

export default function Alerts() {
  const [state, setState] = useState<PushState>('idle');
  const [detail, setDetail] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setState(supportLevel());
    void currentSubscription().then((sub) => {
      if (sub) {
        setState('ready');
        setEndpoint(sub.endpoint);
        setSubscription(sub.toJSON());
      }
    });
  }, []);

  async function enable() {
    setWorking(true);
    setDetail(null);
    const result = await subscribe();
    setState(result.state);
    setDetail(result.detail ?? null);
    setEndpoint(result.endpoint ?? null);
    setSubscription(result.subscription ?? null);
    setWorking(false);
  }

  return (
    <Screen title="Alerts" subtitle="Get told when a rostered player is scratched">
      <div className="stack">
        <div className="status-row">
          <span className="dot" style={{ background: dotColor(state) }} />
          <strong>{label(state)}</strong>
        </div>

        {detail ? <p className="muted" style={{ marginBottom: 0 }}>{detail}</p> : null}

        {state === 'needs-install' ? <InstallSteps /> : null}

        {state === 'idle' || state === 'error' || state === 'no-key' ? (
          <button className="btn" onClick={enable} disabled={working}>
            {working ? 'Working…' : 'Enable alerts'}
          </button>
        ) : null}

        {state === 'denied' ? (
          <p className="muted">
            Turn notifications back on in Settings → Notifications → Bunts, then reopen the app.
          </p>
        ) : null}

        {endpoint && !usingMockData ? (
          <>
            <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>Push endpoint</p>
            <p className="endpoint">{endpoint}</p>
          </>
        ) : null}

        {subscription && usingMockData ? (
          <>
            <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
              No backend yet, so nothing received this. Copy it and paste it into
              the chat to get a test notification sent here.
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

const label = (s: PushState) => ({
  ready: 'Alerts are on for this device',
  idle: 'Not enabled yet',
  'needs-install': 'Add to home screen first',
  unsupported: 'This browser cannot receive push',
  denied: 'Notifications are blocked',
  'no-key': 'Backend not ready',
  error: 'Something went wrong',
}[s]);

const dotColor = (s: PushState) =>
  s === 'ready' ? 'var(--grass)'
  : s === 'denied' || s === 'error' || s === 'unsupported' ? 'var(--clay)'
  : 'var(--amber)';
