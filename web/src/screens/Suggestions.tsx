import { useEffect, useState } from 'react';
import { api } from '../api';
import { Screen } from '../components';
import { ComposeSheet, partnerName, SuggestionRow, SuggestionSheet } from '../Suggestions';
import type { Suggestion } from '../types';
import { useAsync } from '../useAsync';

type Filter = 'open' | 'closed';

/**
 * Everything the two owners have proposed to each other. Open ones first --
 * those want a decision -- and the closed history a tap away.
 */
export default function SuggestionsScreen({
  onBack, focusId = null, onFocused,
}: {
  onBack: () => void;
  /** Open this one straight away -- set when the screen was reached by tapping its notification. */
  focusId?: string | null;
  onFocused?: () => void;
}) {
  const loaded = useAsync(() => api.getSuggestions());
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => { if (loaded.data) setItems(loaded.data); }, [loaded.data]);

  // Arriving from a notification: open that suggestion, on whichever filter
  // it belongs to, then drop the link from the URL so a reload doesn't
  // reopen it. A link to one that's since been pruned just shows the list.
  useEffect(() => {
    if (!focusId || !loaded.data) return;
    const target = loaded.data.find((s) => s.id === focusId);
    if (target) {
      setFilter(target.state === 'open' ? 'open' : 'closed');
      setSelectedId(target.id);
    }
    if (location.hash.startsWith('#suggestions')) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    onFocused?.();
  }, [focusId, loaded.data, onFocused]);

  // Once they've been on screen they're no longer new -- but keep the dots for
  // this visit, so you can still see which ones were.
  const unread = (loaded.data ?? []).filter((s) => s.unread).length;
  useEffect(() => {
    if (unread > 0) void api.markSuggestionsSeen().catch(() => {});
  }, [unread]);

  const list = items ?? [];
  const partner = partnerName(list);
  const open = list.filter((s) => s.state === 'open');
  const closed = list.filter((s) => s.state !== 'open');
  const shown = filter === 'open' ? open : closed;
  const selected = list.find((s) => s.id === selectedId) ?? null;

  // Acting on one updates it in place and floats it to the top, as the server orders them.
  const upsert = (s: Suggestion) =>
    setItems((cur) => [s, ...(cur ?? []).filter((x) => x.id !== s.id)]);

  return (
    <>
      <Screen
        title="Suggestions"
        subtitle={`Moves you and ${partner} are weighing. Make them in Yahoo, then mark them done.`}
        onBack={onBack}
        loading={loaded.loading && !items}
        error={loaded.error}
        onReload={loaded.reload}
      >
        <button className="btn compose-btn" onClick={() => setComposing(true)}>Suggest a move</button>

        <div className="segmented sugg-filter" role="tablist" aria-label="Filter">
          {(['open', 'closed'] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className="seg"
              onClick={() => setFilter(f)}
            >
              {f === 'open' ? `Open · ${open.length}` : `Closed · ${closed.length}`}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="item plain">
            <p className="verdict" style={{ marginTop: 0 }}>
              {filter === 'open'
                ? `Nothing open. Suggest a pickup, a swap or a start/sit and ${partner} gets a notification.`
                : 'Nothing closed yet.'}
            </p>
          </div>
        ) : (
          shown.map((s) => <SuggestionRow key={s.id} s={s} onOpen={() => setSelectedId(s.id)} />)
        )}
      </Screen>

      {selected ? (
        <SuggestionSheet
          suggestion={selected}
          partner={partner}
          onClose={() => setSelectedId(null)}
          onChange={upsert}
        />
      ) : null}

      {composing ? (
        <ComposeSheet
          partner={partner}
          onClose={() => setComposing(false)}
          onSent={(s) => { upsert(s); setComposing(false); setFilter('open'); }}
        />
      ) : null}
    </>
  );
}
