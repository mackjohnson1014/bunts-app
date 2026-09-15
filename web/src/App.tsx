import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { InstallBanner } from './InstallBanner';
import { Onboarding } from './Onboarding';
import { api, usingMockData } from './api';
import { useAsync } from './useAsync';
import { useUpdateAvailable } from './useRefresh';
import { HomeIcon, KeepersIcon, RosterIcon, SettingsIcon, TodayIcon, WeekIcon } from './icons';
import type { IconProps } from './icons';
import Home from './screens/Home';
import Today from './screens/Today';
import MatchupScreen from './screens/Matchup';
import RosterScreen from './screens/Roster';
import Keepers from './screens/Keepers';
import TransactionsScreen from './screens/Transactions';
import Settings from './screens/Settings';

// 'transactions' is deliberately not in TABS below -- it lives on the Home
// tile grid and behind a transaction push, not in the bottom nav, so the
// dock stays at six items rather than growing every time a section is added.
export type Tab = 'home' | 'today' | 'week' | 'roster' | 'keepers' | 'transactions' | 'settings';

const TABS: { id: Tab; label: string; Icon: (props: IconProps) => ReactNode }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'today', label: 'Today', Icon: TodayIcon },
  { id: 'week', label: 'Week', Icon: WeekIcon },
  { id: 'roster', label: 'Roster', Icon: RosterIcon },
  { id: 'keepers', label: 'Keepers', Icon: KeepersIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export default function App() {
  // A reload or deep link to #settings/<section> should land on the
  // Settings tab directly, not flash Home first. Otherwise Home is the
  // front door -- Today is a section like any other now, not the default.
  const [tab, setTab] = useState<Tab>(() => (location.hash.startsWith('#settings') ? 'settings' : 'home'));
  const [pushNonce, setPushNonce] = useState(0);
  const update = useUpdateAvailable();
  const me = useAsync(() => api.me());
  // Lets the flow be re-viewed without wiping a profile to get back to it.
  // On the sample-data preview, ?onboarding=1 jumps straight there, so the
  // flow can be reviewed without a real account. Gated on mocks so it can
  // never be triggered against the live app.
  const [replayOnboarding, setReplayOnboarding] = useState(
    () => usingMockData && new URLSearchParams(location.search).has('onboarding'),
  );

  // A push arriving while the app is open should surface whatever it's
  // about: a transaction alert opens Transactions, everything else (a
  // scratch, a co-owner suggestion) opens Today, where those live.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push') {
        const kind = (event.data.payload as { data?: { type?: string } } | undefined)?.data?.type;
        setTab(kind === 'transaction' ? 'transactions' : 'today');
        setPushNonce((n) => n + 1);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  // Hold the app back rather than flashing Home and then replacing it.
  if (me.loading) return <div className="app" />;

  if (me.data && (me.data.needsOnboarding || replayOnboarding)) {
    return (
      <Onboarding
        user={me.data}
        onDone={() => { setReplayOnboarding(false); me.reload(); }}
      />
    );
  }

  return (
    <div className="app">
      {usingMockData ? (
        <div className="preview-bar">
          Preview build · sample data · not connected to your league
        </div>
      ) : null}

      {update.available ? (
        <button className="update-pill" onClick={update.apply}>
          New version available — tap to update
        </button>
      ) : null}

      <InstallBanner />

      {tab === 'home' && <Home onOpen={setTab} />}
      {tab === 'today' && <Today key={pushNonce} />}
      {tab === 'week' && <MatchupScreen />}
      {tab === 'roster' && <RosterScreen />}
      {tab === 'keepers' && <Keepers />}
      {tab === 'transactions' && <TransactionsScreen key={pushNonce} />}
      {tab === 'settings' && (
        <Settings
          user={me.data ?? null}
          onProfileChange={me.reload}
          onReplayOnboarding={() => setReplayOnboarding(true)}
        />
      )}

      <nav className="tabs" role="tablist" aria-label="Screens">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            className="tab"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              // A plain tap on the Settings tab should always land on the
              // list, not wherever a stale #settings/<section> hash points
              // -- that hash is only meant to restore a reload/deep link.
              if (t.id === 'settings' && tab !== 'settings' && location.hash.startsWith('#settings/')) {
                history.replaceState(null, '', location.pathname + location.search);
              }
              setTab(t.id);
            }}
          >
            <t.Icon className="tab-icon" />
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
