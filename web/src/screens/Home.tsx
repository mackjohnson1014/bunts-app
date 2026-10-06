import type { ReactNode } from 'react';
import { api } from '../api';
import { Screen } from '../components';
import { partnerName, SuggestionRow } from '../Suggestions';
import { useAsync } from '../useAsync';
import { KeepersIcon, RosterIcon, SettingsIcon, TodayIcon, TransactionsIcon, WeekIcon } from '../icons';
import type { IconProps } from '../icons';
import type { Tab } from '../App';

type Section = Exclude<Tab, 'home' | 'suggestions'>;

const SECTIONS: { id: Section; label: string; Icon: (props: IconProps) => ReactNode }[] = [
  { id: 'today', label: 'Today', Icon: TodayIcon },
  { id: 'week', label: 'Matchup', Icon: WeekIcon },
  { id: 'roster', label: 'Roster', Icon: RosterIcon },
  { id: 'keepers', label: 'Keepers', Icon: KeepersIcon },
  { id: 'transactions', label: 'Transactions', Icon: TransactionsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

/**
 * The landing screen: a grid of tiles, one per section, iPhone-home-screen
 * style. Replaces Today as the tab the app opens on -- Today is still a full
 * tab of its own, just no longer the default view.
 */
export default function Home({ onOpen }: { onOpen: (tab: Exclude<Tab, 'home'>) => void }) {
  return (
    <Screen title="Home">
      <SuggestionsCard onOpen={() => onOpen('suggestions')} />
      <div className="home-grid">
        {SECTIONS.map((s) => (
          <button key={s.id} className="home-tile" onClick={() => onOpen(s.id)}>
            <span className="home-tile-icon">
              <s.Icon className="home-tile-svg" />
            </span>
            <span className="home-tile-label">{s.label}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}

/**
 * What the two owners have open with each other, up top where it can't be
 * missed. The full list, history and composer are one tap away.
 */
function SuggestionsCard({ onOpen }: { onOpen: () => void }) {
  const list = useAsync(() => api.getSuggestions());
  const all = list.data ?? [];
  const open = all.filter((s) => s.state === 'open');
  const unread = all.filter((s) => s.unread).length;
  const partner = partnerName(all);

  return (
    <section className="sugg-card" aria-label="Suggestions">
      <button className="sugg-card-head" onClick={onOpen}>
        <span className="sugg-card-title">Suggestions</span>
        {unread > 0 ? <span className="badge-new">{unread} new</span> : null}
        <span className="sugg-card-count">
          {list.loading ? '' : `${open.length} open`}
        </span>
        <span className="chevron" aria-hidden="true">›</span>
      </button>

      {list.loading ? (
        <p className="muted sugg-card-empty">Loading…</p>
      ) : list.error ? (
        <p className="muted sugg-card-empty">Couldn’t load suggestions.</p>
      ) : open.length === 0 ? (
        <button className="sugg-card-empty link-row" onClick={onOpen}>
          Nothing open with {partner}. <span className="link-btn">Suggest a move</span>
        </button>
      ) : (
        <div className="sugg-card-list">
          {open.slice(0, 3).map((s) => <SuggestionRow key={s.id} s={s} onOpen={onOpen} compact />)}
          {open.length > 3 ? (
            <button className="link-btn sugg-more" onClick={onOpen}>+ {open.length - 3} more</button>
          ) : null}
        </div>
      )}
    </section>
  );
}
