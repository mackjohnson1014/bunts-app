import type { ReactNode } from 'react';
import { api } from '../api';
import { Screen } from '../components';
import { partnerName, SuggestionRow } from '../Suggestions';
import { doneLine, isToday, weekStart } from '../suggestionText';
import type { Suggestion } from '../types';
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
export default function Home({
  onOpen, onOpenSuggestion,
}: {
  onOpen: (tab: Exclude<Tab, 'home'>) => void;
  /** Open the Suggestions screen with this one's sheet already up. */
  onOpenSuggestion: (id: string) => void;
}) {
  return (
    <Screen title="Home">
      <SuggestionsCard onOpen={() => onOpen('suggestions')} onOpenOne={onOpenSuggestion} />
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
function SuggestionsCard({ onOpen, onOpenOne }: { onOpen: () => void; onOpenOne: (id: string) => void }) {
  const list = useAsync(() => api.getSuggestions());
  const all = list.data ?? [];
  const open = all.filter((s) => s.state === 'open');
  const unread = all.filter((s) => s.unread).length;
  const partner = partnerName(all);
  // Closed out as done today, oldest first so it reads as the day's log.
  const madeToday = all
    .filter((s) => s.state === 'done' && s.resolvedBy && isToday(s.resolvedBy.at))
    .sort((a, b) => a.resolvedBy!.at.localeCompare(b.resolvedBy!.at));

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
          {open.slice(0, 3).map((s) => <SuggestionRow key={s.id} s={s} onOpen={() => onOpenOne(s.id)} compact />)}
          {open.length > 3 ? (
            <button className="link-btn sugg-more" onClick={onOpen}>+ {open.length - 3} more</button>
          ) : null}
        </div>
      )}

      {madeToday.length > 0 ? <MadeToday items={madeToday} all={all} onOpenOne={onOpenOne} /> : null}
    </section>
  );
}

/**
 * The day's moves, once they've been made in Yahoo and marked done: a short
 * log of what changed on the team today, and how many adds that used.
 */
function MadeToday({
  items, all, onOpenOne,
}: {
  items: Suggestion[];
  all: Suggestion[];
  onOpenOne: (id: string) => void;
}) {
  const addsToday = items.filter((s) => s.body.kind === 'pickup').length;
  const since = weekStart().getTime();
  const addsThisWeek = all.filter(
    (s) => s.state === 'done' && s.body.kind === 'pickup' && s.resolvedBy && Date.parse(s.resolvedBy.at) >= since,
  ).length;

  const summary = [
    `${items.length} ${items.length === 1 ? 'move' : 'moves'}`,
    addsToday ? `${addsToday} ${addsToday === 1 ? 'add' : 'adds'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="made-today">
      <p className="made-today-head">
        <span>Made today</span>
        <span className="made-today-sum">{summary}</span>
      </p>
      <ul className="made-list">
        {items.map((s) => (
          <li key={s.id}>
            <button className="made-row" onClick={() => onOpenOne(s.id)}>
              <span className="made-check" aria-hidden="true">✓</span>
              <span className="made-text">
                <span className="made-what">{doneLine(s.body)}</span>
                <span className="made-who">
                  {s.mine ? 'Your call' : `${s.authorName.split(' ')[0]}’s call`}
                  {' · '}
                  {new Date(s.resolvedBy!.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {addsThisWeek > 0 ? (
        <p className="muted made-adds">
          {addsThisWeek} {addsThisWeek === 1 ? 'add' : 'adds'} marked done in Bunts this week, of the league’s 6.
          Adds made straight in Yahoo don’t show here yet.
        </p>
      ) : null}
    </div>
  );
}
