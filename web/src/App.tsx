import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { InstallBanner } from './InstallBanner';
import { Onboarding } from './Onboarding';
import { api, usingMockData } from './api';
import { useAsync } from './useAsync';
import { useUpdateAvailable } from './useRefresh';
import { ChatIcon, HomeIcon, KeepersIcon, RosterIcon, SettingsIcon, TodayIcon, WeekIcon } from './icons';
import type { IconProps } from './icons';
import Home from './screens/Home';
import Today from './screens/Today';
import MatchupScreen from './screens/Matchup';
import RosterScreen from './screens/Roster';
import Keepers from './screens/Keepers';
import TransactionsScreen from './screens/Transactions';
import Settings from './screens/Settings';
import SuggestionsScreen from './screens/Suggestions';
import Chat from './screens/Chat';
import type { ChatMessage } from './types';

// Chat is in the dock (seven items now). 'transactions' and 'suggestions'
// are deliberately not in TABS below --
// they're reached from Home (a link, and the suggestions card) and from their
// pushes, not the bottom nav, so the dock stays at six items rather than
// growing every time a section is added.
export type Tab = 'home' | 'chat' | 'today' | 'week' | 'roster' | 'keepers' | 'transactions' | 'suggestions' | 'settings';

/** The suggestion a #suggestions/<id> link (a tapped notification) points at. */
const suggestionIdFrom = (url: string): string | null =>
  url.match(/#suggestions\/([\w-]+)/)?.[1] ?? null;

/** A reload or deep link (#settings/..., #suggestions/<id>) lands where it points. */
function tabFromHash(): Tab {
  if (location.hash.startsWith('#settings')) return 'settings';
  if (location.hash.startsWith('#suggestions')) return 'suggestions';
  if (location.hash.startsWith('#chat')) return 'chat';
  return 'home';
}

const TABS: { id: Tab; label: string; Icon: (props: IconProps) => ReactNode }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'chat', label: 'Chat', Icon: ChatIcon },
  { id: 'today', label: 'Today', Icon: TodayIcon },
  { id: 'week', label: 'Matchup', Icon: WeekIcon },
  { id: 'roster', label: 'Roster', Icon: RosterIcon },
  { id: 'keepers', label: 'Keepers', Icon: KeepersIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export default function App() {
  // A reload or deep link to #settings/<section> should land on the
  // Settings tab directly, not flash Home first. Otherwise Home is the
  // front door -- Today is a section like any other now, not the default.
  const [tab, setTab] = useState<Tab>(tabFromHash);
  // Chat: unread count for the tab badge, and the latest message that came
  // in by push while the app was open (shown before the server catches up).
  const [chatUnread, setChatUnread] = useState(0);
  const [chatIncoming, setChatIncoming] = useState<ChatMessage | null>(null);
  const [focusSuggestion, setFocusSuggestion] = useState<string | null>(() => suggestionIdFrom(location.hash));
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
  // about: a transaction alert opens Transactions, anything from the co-owner
  // opens Suggestions, and the rest (a scratch, an unposted lineup) opens Today.
  // Tapping a notification while the app is open sends 'navigate' instead.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push') {
        const data = (event.data.payload as { data?: { type?: string; message?: ChatMessage } } | undefined)?.data;
        const kind = data?.type;
        // An update push while the app is open: the "new version" pill already
        // shows; don't move them. Tapping the notification still goes to the changelog.
        if (kind === 'update') return;
        // A chat message shouldn't yank you off whatever you're doing: badge
        // it, and if Chat is open, show it there.
        if (kind === 'chat') {
          if (data?.message) setChatIncoming(data.message);
          setChatUnread((n) => n + 1);
          return;
        }
        setTab(kind === 'transaction' ? 'transactions' : kind === 'suggestion' ? 'suggestions' : 'today');
        setPushNonce((n) => n + 1);
      } else if (event.data?.type === 'navigate' && String(event.data.url ?? '').includes('#settings/changelog')) {
        // Tapped an update push: land on the changelog with that release highlighted.
        location.hash = String(event.data.url).slice(String(event.data.url).indexOf('#'));
        setTab('settings');
      } else if (event.data?.type === 'navigate' && String(event.data.url ?? '').includes('#chat')) {
        setTab('chat');
      } else if (event.data?.type === 'navigate' && String(event.data.url ?? '').includes('#suggestions')) {
        setTab('suggestions');
        setFocusSuggestion(suggestionIdFrom(String(event.data.url)));
        setPushNonce((n) => n + 1);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  // While the app is open and on screen, check in every couple of minutes so
  // the other owner sees you as active. Any API call counts; this covers
  // sitting on one screen without loading anything.
  useEffect(() => {
    if (usingMockData) return;
    const beat = () => { if (document.visibilityState === 'visible') void api.heartbeat().catch(() => {}); };
    const id = setInterval(beat, 120_000);
    document.addEventListener('visibilitychange', beat);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', beat); };
  }, []);

  // The Chat tab's badge: checked on launch, when the app comes back to the
  // foreground, and every minute while it's open -- mid-conversation messages
  // don't push (by design), so a push alone would leave the badge stale.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') {
        void api.chatUnread().then((r) => setChatUnread(r.unread)).catch(() => {});
      }
    };
    check();
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', check); };
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

      {tab === 'home' && (
        <Home
          onOpen={setTab}
          onOpenSuggestion={(id) => { setFocusSuggestion(id); setTab('suggestions'); }}
        />
      )}
      {tab === 'chat' && (
        <Chat me={me.data?.email ?? null} incoming={chatIncoming} onRead={() => setChatUnread(0)} />
      )}
      {tab === 'today' && <Today key={pushNonce} />}
      {tab === 'week' && <MatchupScreen />}
      {tab === 'roster' && <RosterScreen />}
      {tab === 'keepers' && <Keepers />}
      {tab === 'transactions' && <TransactionsScreen key={pushNonce} />}
      {tab === 'suggestions' && (
        <SuggestionsScreen
          key={pushNonce}
          focusId={focusSuggestion}
          onFocused={() => setFocusSuggestion(null)}
          onBack={() => setTab('home')}
        />
      )}
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
            <span className="tab-icon-wrap">
              <t.Icon className="tab-icon" />
              {t.id === 'chat' && chatUnread > 0 && tab !== 'chat' ? (
                <span className="tab-dot" aria-label={`${chatUnread} unread`}>{chatUnread > 9 ? '9+' : chatUnread}</span>
              ) : null}
            </span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
