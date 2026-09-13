import { useEffect, useState } from 'react';
import Today from './screens/Today';
import RosterScreen from './screens/Roster';
import Keepers from './screens/Keepers';
import Alerts from './screens/Alerts';

type Tab = 'today' | 'roster' | 'keepers' | 'alerts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'roster', label: 'Roster' },
  { id: 'keepers', label: 'Keepers' },
  { id: 'alerts', label: 'Alerts' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [pushNonce, setPushNonce] = useState(0);

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

  return (
    <div className="app">
      {tab === 'today' && <Today key={pushNonce} />}
      {tab === 'roster' && <RosterScreen />}
      {tab === 'keepers' && <Keepers />}
      {tab === 'alerts' && <Alerts />}

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
