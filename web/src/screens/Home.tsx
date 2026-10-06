import { useState } from 'react';
import { api } from '../api';
import { Screen } from '../components';
import { ComposeSheet, partnerName, SuggestionRow } from '../Suggestions';
import { ago, doneLine, headline, isToday, weekStart } from '../suggestionText';
import type { PersonStatus, Suggestion } from '../types';
import { useAsync } from '../useAsync';
import type { Tab } from '../App';

/**
 * The daily page: where the two owners propose and settle the day's lineup
 * changes and pickups. Suggest a move up top, what's open between you, and a
 * log of what got made or passed today. The other sections live in the
 * bottom nav (Transactions, which isn't there, gets a link at the foot).
 */
export default function Home({
  onOpen, onOpenSuggestion,
}: {
  onOpen: (tab: Exclude<Tab, 'home'>) => void;
  /** Open the Suggestions screen with this one's sheet already up. */
  onOpenSuggestion: (id: string) => void;
}) {
  const list = useAsync(() => api.getSuggestions());
  const people = useAsync(() => api.getPeople());
  const [composing, setComposing] = useState(false);
  const [delivery, setDelivery] = useState<string | null>(null);
  const partner = partnerName(list.data);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      <Screen title="Home" subtitle={today} onReload={() => { list.reload(); people.reload(); }}>
        <Presence people={people.data} loading={people.loading} />

        <button className="btn compose-btn" onClick={() => { setDelivery(null); setComposing(true); }}>
          Suggest a move
        </button>
        {delivery ? <p className="delivery-note muted" role="status">{delivery}</p> : null}

        <SuggestionsCard
          list={list}
          onOpen={() => onOpen('suggestions')}
          onOpenOne={onOpenSuggestion}
          onCompose={() => setComposing(true)}
        />

        <button className="link-row home-link" onClick={() => onOpen('transactions')}>
          Opponent &amp; league transactions <span className="chevron" aria-hidden="true">›</span>
        </button>
      </Screen>

      {composing ? (
        <ComposeSheet
          partner={partner}
          onClose={() => setComposing(false)}
          onSent={(_s, line) => { setComposing(false); setDelivery(line); list.reload(); }}
        />
      ) : null}
    </>
  );
}

/**
 * What the two owners have open with each other, and today's log of what
 * got settled. The full list and history are one tap away.
 */
function SuggestionsCard({
  list, onOpen, onOpenOne, onCompose,
}: {
  list: { data: Suggestion[] | null; loading: boolean; error: unknown };
  onOpen: () => void;
  onOpenOne: (id: string) => void;
  onCompose: () => void;
}) {
  const all = list.data ?? [];
  const open = all.filter((s) => s.state === 'open');
  const unread = all.filter((s) => s.unread).length;
  const partner = partnerName(all);
  // Closed out today -- made or passed -- oldest first so it reads as the day's log.
  const closedToday = all
    .filter((s) => (s.state === 'done' || s.state === 'passed') && s.resolvedBy && isToday(s.resolvedBy.at))
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

      {list.loading && !list.data ? (
        <p className="muted sugg-card-empty">Loading…</p>
      ) : list.error ? (
        <p className="muted sugg-card-empty">Couldn’t load suggestions.</p>
      ) : open.length === 0 ? (
        <button className="sugg-card-empty link-row" onClick={onCompose}>
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

      {closedToday.length > 0 ? <ClosedToday items={closedToday} all={all} onOpenOne={onOpenOne} /> : null}
    </section>
  );
}

/**
 * The day's decisions: moves made in Yahoo and marked done, and ones you
 * passed on, as a short log -- plus how many adds the made ones used.
 */
function ClosedToday({
  items, all, onOpenOne,
}: {
  items: Suggestion[];
  all: Suggestion[];
  onOpenOne: (id: string) => void;
}) {
  const made = items.filter((s) => s.state === 'done');
  const passed = items.length - made.length;
  const addsToday = made.filter((s) => s.body.kind === 'pickup').length;
  const since = weekStart().getTime();
  const addsThisWeek = all.filter(
    (s) => s.state === 'done' && s.body.kind === 'pickup' && s.resolvedBy && Date.parse(s.resolvedBy.at) >= since,
  ).length;

  const summary = [
    made.length ? `${made.length} made` : null,
    passed ? `${passed} passed` : null,
    addsToday ? `${addsToday} ${addsToday === 1 ? 'add' : 'adds'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="made-today">
      <p className="made-today-head">
        <span>Today</span>
        <span className="made-today-sum">{summary}</span>
      </p>
      <ul className="made-list">
        {items.map((s) => (
          <li key={s.id}>
            <button className={`made-row${s.state === 'passed' ? ' passed' : ''}`} onClick={() => onOpenOne(s.id)}>
              <span className="made-check" aria-hidden="true">{s.state === 'done' ? '✓' : '✕'}</span>
              <span className="made-text">
                <span className="made-what">
                  {s.state === 'done' ? doneLine(s.body) : `Passed: ${headline(s.body)}`}
                </span>
                <span className="made-who">
                  {s.mine ? 'Your call' : `${s.authorName.split(' ')[0]}’s call`}
                  {s.state === 'passed' && s.resolvedBy
                    ? ` · ${s.resolvedBy.email === s.authorEmail ? 'withdrawn' : `passed by ${s.mine ? s.resolvedBy.name.split(' ')[0] : 'you'}`}`
                    : ''}
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

/** Within this, "active now"; the app checks in every two minutes while open. */
const ACTIVE_MS = 5 * 60_000;

/**
 * The other owner at a glance: are they around, and will a suggestion
 * actually reach their phone? Answers "why didn't Matt see it" before it's asked.
 */
function Presence({ people, loading }: { people: PersonStatus[] | null; loading: boolean }) {
  if (loading && !people) return null;
  if (!people || people.length === 0) {
    return (
      <div className="presence" role="status">
        <span className="presence-dot off" aria-hidden="true" />
        <span className="presence-text">
          Your co-owner hasn’t signed in to Bunts yet, so suggestions can’t reach them.
        </span>
      </div>
    );
  }
  return (
    <>
      {people.map((p) => {
        const first = p.name.split(' ')[0];
        const seenMs = p.lastSeen ? Date.now() - Date.parse(p.lastSeen) : null;
        const active = seenMs !== null && seenMs < ACTIVE_MS;
        const status =
          active ? 'Active now'
          : p.lastSeen ? `Last in Bunts ${ago(p.lastSeen)} ago`
          : p.joinedAt ? 'Signed in, not seen recently'
          : 'Not seen yet';
        const reach =
          p.devices === 0 ? { text: 'no phone set up for alerts', warn: true }
          : !p.suggestionAlerts ? { text: 'suggestion alerts off', warn: true }
          : { text: 'alerts on', warn: false };
        return (
          <div key={p.name} className="presence" role="status">
            <span className={`presence-dot ${active ? 'on' : seenMs !== null && seenMs < 86_400_000 ? 'recent' : 'off'}`} aria-hidden="true" />
            <span className="presence-text">
              <strong>{first}</strong> · {status} · <span className={reach.warn ? 'warn' : 'ok'}>{reach.text}</span>
            </span>
          </div>
        );
      })}
    </>
  );
}
