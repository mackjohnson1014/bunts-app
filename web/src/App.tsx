import { useEffect, useState } from 'react';
import { InstallBanner } from './InstallBanner';
import { Onboarding } from './Onboarding';
import { api } from './api';
import { useAsync } from './useAsync';
import { useUpdateAvailable } from './useRefresh';
import Today from './screens/Today';
import RosterScreen from './screens/Roster';
import Keepers from './screens/Keepers';
import Settings from './screens/Settings';

type Tab = 'today' | 'roster' | 'keepers' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'roster', label: 'Roster' },
  { id: 'keepers', label: 'Keepers' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [pushNonce, setPushNonce] = useState(0);
  const update = useUpdateAvailable();
  const me = useAsync(() => api.me());

  // A push arriving while the app is open should refresh it, not leave it stale.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push') {
        setTab('today');
        setPushNonce((n) => n + 1);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  // Hold the app back rather than flashing Today and then replacing it.
  if (me.loading) return <div className="app" />;

  if (me.data?.needsOnboarding) {
    return <Onboarding user={me.data} onDone={me.reload} />;
  }

  return (
    <div className="app">
      {update.available ? (
        <button className="update-pill" onClick={update.apply}>
          New version available — tap to update
        </button>
      ) : null}

      <InstallBanner />

      {tab === 'today' && <Today key={pushNonce} />}
      {tab === 'roster' && <RosterScreen />}
      {tab === 'keepers' && <Keepers />}
      {tab === 'settings' && <Settings user={me.data ?? null} onProfileChange={me.reload} />}

      <nav className="tabs" role="tablist" aria-label="Screens">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            className="tab"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
