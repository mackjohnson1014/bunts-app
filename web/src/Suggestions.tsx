import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import type {
  CallKind, Player, PlayerRef, PlayerSearchHit, Roster, Suggestion, SuggestionBody, SuggestionInput, SuggestionKind,
  SuggestionStatus,
} from './types';
import {
  ago, dayWord, deliveryLine, headline, isActive, KIND_LABEL, localDate, reactionLine, refOf, STATE_LABEL, tone,
} from './suggestionText';
import { useAsync } from './useAsync';

/**
 * Co-owner suggestions: proposing a move to the other owner, and the
 * back-and-forth on it. Bunts can't make roster changes (Yahoo is read-only),
 * so each one ends with someone making the move in Yahoo and marking it done.
 */

// The composer needs the roster for its pickers, and is opened from places
// that don't otherwise have it. Share one recent fetch rather than refetching
// a roster built from a few dozen MLB calls every time a sheet opens.
let rosterCache: { at: number; p: Promise<Roster> } | null = null;
function rosterOnce(): Promise<Roster> {
  if (!rosterCache || Date.now() - rosterCache.at > 120_000) {
    const p = api.getRoster();
    rosterCache = { at: Date.now(), p };
    p.catch(() => { rosterCache = null; });
  }
  return rosterCache.p;
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

export interface ComposePreset {
  kind?: SuggestionKind;
  /** The player the composer was opened from; pre-fills whichever role fits him. */
  player?: Player;
}

const KINDS: { id: SuggestionKind; label: string }[] = [
  { id: 'call', label: 'Lineup call' },
  { id: 'swap', label: 'Swap' },
  { id: 'pickup', label: 'Pickup' },
];

const CALLS: { id: CallKind; label: string }[] = [
  { id: 'start', label: 'Start' },
  { id: 'sit', label: 'Sit' },
  { id: 'watch', label: 'Keep an eye' },
];

export function Composer({
  preset, partner, onSent,
}: {
  preset?: ComposePreset;
  partner: string;
  onSent: (s: Suggestion, delivery: string) => void;
}) {
  const roster = useAsync(() => rosterOnce());
  const players = roster.data?.players ?? [];
  const byKey = useMemo(() => new Map(players.map((p) => [p.playerKey, p])), [players]);

  const p0 = preset?.player;
  const [kind, setKind] = useState<SuggestionKind>(preset?.kind ?? 'call');
  const [callKey, setCallKey] = useState(p0?.playerKey ?? '');
  const [call, setCall] = useState<CallKind>('start');
  const [dayOffset, setDayOffset] = useState<0 | 1>(0);
  const [startKey, setStartKey] = useState(p0 && !isActive(p0) ? p0.playerKey : '');
  const [benchKey, setBenchKey] = useState(p0 && isActive(p0) ? p0.playerKey : '');
  const [add, setAdd] = useState<PlayerSearchHit | null>(null);
  const [dropKey, setDropKey] = useState(p0?.playerKey ?? '');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ line: string; ok: boolean } | null>(null);

  const dated = kind === 'swap' || (kind === 'call' && call !== 'watch');
  const ref = (key: string): PlayerRef | null => {
    const p = byKey.get(key);
    return p ? refOf(p) : null;
  };

  let input: SuggestionInput | null = null;
  const date = dated ? localDate(dayOffset) : null;
  if (kind === 'call') {
    const player = ref(callKey);
    if (player) input = { kind, player, call, note, date };
  } else if (kind === 'swap') {
    const start = ref(startKey);
    const bench = ref(benchKey);
    if (start && bench && start.key !== bench.key) input = { kind, start, bench, note, date };
  } else if (add) {
    input = {
      kind, add: { key: add.key, name: add.name, team: add.team, pos: add.pos },
      drop: ref(dropKey), note, date: null,
    };
  }

  async function send() {
    if (!input) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.addSuggestion({ ...input, note: note.trim() });
      const line = deliveryLine(partner, res.notified, res.skipped);
      // Say whether it actually reached them before the sheet goes away --
      // a silent close hid "they have no phone registered" entirely.
      setSent({ line, ok: res.notified > 0 });
      setTimeout(() => onSent(res.suggestion, line), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setSending(false);
  }

  if (sent) {
    return <p className={`delivery ${sent.ok ? 'ok' : 'warn'}`} role="status">{sent.line}</p>;
  }
  if (roster.loading) return <p className="muted">Loading your roster…</p>;
  if (roster.error) return <p className="muted">Couldn’t load the roster to suggest from.</p>;

  return (
    <div className="composer">
      <Segmented options={KINDS} value={kind} onChange={setKind} label="Kind of suggestion" />

      {kind === 'call' ? (
        <>
          <Field label="Player">
            <PlayerSelect players={players} value={callKey} onChange={setCallKey} />
          </Field>
          <Field label="Call">
            <Segmented options={CALLS} value={call} onChange={setCall} label="Call" />
          </Field>
        </>
      ) : null}

      {kind === 'swap' ? (
        <>
          <Field label="Start">
            <PlayerSelect
              players={players} value={startKey} onChange={setStartKey}
              filter={(p) => !isActive(p)} placeholder="Pick a bench player"
            />
          </Field>
          <Field label="In place of">
            <PlayerSelect
              players={players} value={benchKey} onChange={setBenchKey}
              filter={isActive} placeholder="Pick a starter to bench"
            />
          </Field>
        </>
      ) : null}

      {dated ? (
        <Field label="For">
          <Segmented
            options={[{ id: 0 as const, label: 'Today' }, { id: 1 as const, label: 'Tomorrow' }]}
            value={dayOffset} onChange={setDayOffset} label="Day"
          />
          <p className="muted field-hint">Drops off at that day’s first pitch.</p>
        </Field>
      ) : null}

      {kind === 'pickup' ? (
        <>
          <Field label="Add">
            {add ? (
              <div className="picked">
                <span className="picked-name">{add.name}</span>
                <span className="pmeta">{[add.team, add.pos].filter(Boolean).join(' · ')}</span>
                <button className="link-btn" onClick={() => setAdd(null)}>Change</button>
              </div>
            ) : (
              <PlayerSearch onPick={setAdd} rostered={byKey} />
            )}
          </Field>
          <Field label="Drop">
            <PlayerSelect
              players={players} value={dropKey} onChange={setDropKey}
              placeholder="Nobody — there’s an open spot"
            />
          </Field>
          <p className="muted field-hint">
            Bunts can’t see waivers yet, so check he’s available in Yahoo.
            {roster.data?.league.weeklyAddLimit
              ? ` Adds count toward the league’s ${roster.data.league.weeklyAddLimit} a week.`
              : ''}
          </p>
        </>
      ) : null}

      <textarea
        className="note-input"
        placeholder={`Why? (optional — ${partner} sees this)`}
        value={note}
        maxLength={280}
        rows={2}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="btn" onClick={send} disabled={!input || sending}>
        {sending ? 'Sending…' : `Send to ${partner}`}
      </button>
      {error ? <p className="muted" style={{ color: 'var(--clay)', marginTop: 8 }}>{error}</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  options, value, onChange, label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          role="radio"
          aria-checked={value === o.id}
          aria-selected={value === o.id}
          className="seg"
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const GROUPS: { label: string; test: (p: Player) => boolean }[] = [
  { label: 'Starting', test: isActive },
  { label: 'Bench', test: (p) => p.slot === 'BN' },
  { label: 'Injured list', test: (p) => !isActive(p) && p.slot !== 'BN' },
];

function PlayerSelect({
  players, value, onChange, filter, placeholder = 'Pick a player',
}: {
  players: Player[];
  value: string;
  onChange: (key: string) => void;
  filter?: (p: Player) => boolean;
  placeholder?: string;
}) {
  // Always keep the current value selectable, even if a filter would hide it
  // (e.g. opened from a player the filter doesn't expect).
  const shown = players.filter((p) => !filter || filter(p) || p.playerKey === value);
  return (
    <select className="field-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {GROUPS.map((g) => {
        const group = shown.filter(g.test);
        return group.length === 0 ? null : (
          <optgroup key={g.label} label={g.label}>
            {group.map((p) => (
              <option key={p.playerKey} value={p.playerKey}>
                {p.name} · {p.positions.join('/')}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

function PlayerSearch({
  onPick, rostered,
}: {
  onPick: (p: PlayerSearchHit) => void;
  rostered: Map<string, Player>;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<PlayerSearchHit[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      api.searchPlayers(q)
        .then((r) => { if (!cancelled) { setHits(r); setError(false); } })
        .catch(() => { if (!cancelled) setError(true); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div>
      <input
        className="field-input"
        type="search"
        placeholder="Search MLB players"
        value={q}
        autoComplete="off"
        onChange={(e) => setQ(e.target.value)}
      />
      {error ? <p className="muted field-hint">Search isn’t working right now.</p> : null}
      {hits && hits.length === 0 ? <p className="muted field-hint">No active players match.</p> : null}
      {hits && hits.length > 0 ? (
        <ul className="hits">
          {hits.map((h) => {
            const ours = rostered.has(h.key);
            return (
              <li key={h.key}>
                <button className="hit" onClick={() => onPick(h)} disabled={ours}>
                  <span className="hit-name">{h.name}</span>
                  <span className="pmeta">
                    {ours ? 'On our roster' : [h.team, h.pos].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

/** Bottom sheet shell, matching PlayerSheet's. */
export function Sheet({
  title, eyebrow, onClose, children,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <div style={{ minWidth: 0 }}>
            {eyebrow ? <p className="sheet-eyebrow">{eyebrow}</p> : null}
            <h2 className="sheet-name sugg-title">{title}</h2>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function ComposeSheet({
  preset, partner, onClose, onSent,
}: {
  preset?: ComposePreset;
  partner: string;
  onClose: () => void;
  onSent: (s: Suggestion, delivery: string) => void;
}) {
  return (
    <Sheet title="Suggest a move" eyebrow={`To ${partner}`} onClose={onClose}>
      <div style={{ height: 14 }} />
      <Composer preset={preset} partner={partner} onSent={onSent} />
    </Sheet>
  );
}

/** One suggestion in full: what's proposed, the reactions and replies, and closing it out. */
export function SuggestionSheet({
  suggestion: s, partner, onClose, onChange,
}: {
  suggestion: Suggestion;
  partner: string;
  onClose: () => void;
  onChange: (s: Suggestion) => void;
}) {
  const [reply, setReply] = useState('');
  const [countering, setCountering] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(what: string, fn: () => Promise<{ suggestion: Suggestion }>) {
    setBusy(what);
    setError(null);
    try {
      onChange((await fn()).suggestion);
      if (what === 'reply') setReply('');
      if (what === 'counter') setCountering(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  const myReaction = s.myTerms ? null : s.reactions[0]?.value ?? null;
  const open = s.state === 'open';
  const countered = s.replies.some((r) => r.counter);
  const meta = [s.mine ? 'You' : s.authorName, ago(s.createdAt), s.date ? dayWord(s.date) : null]
    .filter(Boolean).join(' · ');
  const termsName = s.termsBy ? (s.myTerms ? 'you' : s.termsBy.name.split(' ')[0]) : null;

  return (
    <Sheet title={headline(s.body)} eyebrow={KIND_LABEL[s.body.kind]} onClose={onClose}>
      <p className="sugg-meta">
        <span className={`chip ${chipClass(s)}`}>{STATE_LABEL[s.state]}</span>
        <span>{meta}</span>
      </p>

      {countered && termsName ? <p className="countered-tag">Countered by {termsName} · now:</p> : null}
      <Moves body={s.body} />

      {s.note ? (
        <p className="sugg-note">
          {countered ? <span className="note-label">{s.mine ? 'Your' : `${s.authorName.split(' ')[0]}’s`} original note</span> : null}
          {s.note}
        </p>
      ) : null}

      {s.state === 'done' || s.state === 'passed' ? (
        <p className="muted">
          {s.state === 'done' ? 'Made in Yahoo' : 'Passed on'} by {s.resolvedBy?.name ?? 'someone'}
          {s.resolvedBy ? ` · ${ago(s.resolvedBy.at)} ago` : ''}
        </p>
      ) : null}
      {s.state === 'expired' ? (
        <p className="muted">That day’s games have started, so this one has expired.</p>
      ) : null}

      {/* Only the person who didn't put forward the current terms reacts. */}
      {s.myTerms ? (
        <p className="muted">{reactionLine(s) ?? `${partner} hasn’t weighed in yet.`}</p>
      ) : open ? (
        <div className="react-row">
          {(['agree', 'disagree'] as const).map((v) => (
            <button
              key={v}
              className={`react-btn ${v}${myReaction === v ? ' on' : ''}`}
              aria-pressed={myReaction === v}
              disabled={busy !== null}
              onClick={() => run('react', () => api.reactToSuggestion(s.id, myReaction === v ? null : v))}
            >
              {v === 'agree' ? 'Agree' : 'Disagree'}
            </button>
          ))}
        </div>
      ) : reactionLine(s) ? (
        <p className="muted">{reactionLine(s)}</p>
      ) : null}

      <p className="sect">Thread{s.replies.length ? ` · ${s.replies.length}` : ''}</p>
      {s.replies.length === 0 ? <p className="muted">No replies yet.</p> : (
        <ul className="thread">
          {s.replies.map((r) => (
            <li key={r.id} className={r.counter ? 'counter' : ''}>
              <span className="thread-who">
                {r.name} · {ago(r.at)}{r.counter ? ' · countered' : ''}
              </span>
              {r.counter ? <CounterDiff from={r.counter.from} to={r.counter.to} /> : null}
              {r.text ? <span className="thread-text">{r.text}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {open && s.body.kind === 'pickup' ? (
        countering ? (
          <CounterForm
            current={s.body}
            busy={busy === 'counter'}
            onCancel={() => setCountering(false)}
            onSend={(input) => run('counter', () => api.counterSuggestion(s.id, input))}
          />
        ) : (
          <button className="btn ghost counter-btn" disabled={busy !== null} onClick={() => setCountering(true)}>
            Counter with a different add/drop
          </button>
        )
      ) : null}

      <textarea
        className="note-input"
        placeholder="Reply"
        value={reply}
        maxLength={280}
        rows={2}
        onChange={(e) => setReply(e.target.value)}
      />
      <button
        className="btn ghost"
        disabled={!reply.trim() || busy !== null}
        onClick={() => run('reply', () => api.replyToSuggestion(s.id, reply))}
      >
        {busy === 'reply' ? 'Sending…' : 'Reply'}
      </button>

      {open ? (
        <div className="resolve-row">
          <button className="btn" disabled={busy !== null} onClick={() => run('done', () => api.resolveSuggestion(s.id, 'done'))}>
            Made it in Yahoo
          </button>
          <button className="btn ghost" disabled={busy !== null} onClick={() => run('pass', () => api.resolveSuggestion(s.id, 'passed'))}>
            Pass
          </button>
        </div>
      ) : s.state !== 'expired' ? (
        <button
          className="btn ghost"
          disabled={busy !== null}
          onClick={() => run('reopen', () => api.resolveSuggestion(s.id, 'open' as SuggestionStatus))}
        >
          Reopen
        </button>
      ) : null}

      {error ? <p className="muted" style={{ color: 'var(--clay)', marginTop: 8 }}>{error}</p> : null}
    </Sheet>
  );
}

/** What a counter changed: the new add/drop, with the replaced player struck through beside it. */
function CounterDiff({ from, to }: { from: SuggestionBody; to: SuggestionBody }) {
  if (from.kind !== 'pickup' || to.kind !== 'pickup') return null;
  const line = (verb: string, now: PlayerRef | null, was: PlayerRef | null) => {
    if (!now && !was) return null;
    const changed = (now?.key ?? null) !== (was?.key ?? null);
    return (
      <span className="diff-line">
        <span className="move-verb">{verb}</span>
        <span className="diff-now">{now ? now.name : 'nobody'}</span>
        {changed ? <s className="diff-was">{was ? was.name : 'nobody'}</s> : null}
      </span>
    );
  };
  return (
    <span className="diff">
      {line('Add', to.add, from.add)}
      {line('Drop', to.drop, from.drop)}
    </span>
  );
}

/** Propose a different add and/or drop on an open pickup, starting from the current terms. */
function CounterForm({
  current, busy, onCancel, onSend,
}: {
  current: Extract<SuggestionBody, { kind: 'pickup' }>;
  busy: boolean;
  onCancel: () => void;
  onSend: (input: { add: PlayerRef; drop: PlayerRef | null; text: string }) => void;
}) {
  const roster = useAsync(() => rosterOnce());
  const players = roster.data?.players ?? [];
  const byKey = useMemo(() => new Map(players.map((p) => [p.playerKey, p])), [players]);
  const [add, setAdd] = useState<PlayerRef | null>(current.add);
  const [dropKey, setDropKey] = useState(current.drop?.key ?? '');
  const [text, setText] = useState('');

  const drop: PlayerRef | null = byKey.has(dropKey) ? refOf(byKey.get(dropKey)!) : null;
  const unchanged = add?.key === current.add.key && (drop?.key ?? null) === (current.drop?.key ?? null);

  return (
    <div className="counter-form">
      <p className="sect" style={{ marginTop: 18 }}>Your counter</p>
      <Field label="Add">
        {add ? (
          <div className="picked">
            <span className="picked-name">{add.name}</span>
            <span className="pmeta">{[add.team, add.pos].filter(Boolean).join(' · ')}</span>
            <button className="link-btn" onClick={() => setAdd(null)}>Change</button>
          </div>
        ) : (
          <PlayerSearch onPick={(h) => setAdd({ key: h.key, name: h.name, team: h.team, pos: h.pos })} rostered={byKey} />
        )}
      </Field>
      <Field label="Drop">
        {roster.loading ? <p className="muted">Loading your roster…</p> : (
          <PlayerSelect
            players={players} value={byKey.has(dropKey) ? dropKey : ''}
            onChange={setDropKey} placeholder="Nobody — there’s an open spot"
          />
        )}
      </Field>
      <textarea
        className="note-input"
        placeholder="Why this instead? (optional)"
        value={text}
        maxLength={280}
        rows={2}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="resolve-row">
        <button
          className="btn"
          disabled={!add || unchanged || busy}
          onClick={() => add && onSend({ add, drop, text })}
        >
          {busy ? 'Sending…' : 'Send counter'}
        </button>
        <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
      {unchanged && add ? <p className="muted field-hint">Change the add or the drop to counter.</p> : null}
    </div>
  );
}

/** The players involved, one line each, marked with which way they move. */
function Moves({ body: b }: { body: SuggestionBody }) {
  const rows: { sign: string; cls: string; verb: string; p: PlayerRef }[] =
    b.kind === 'pickup' ? [
      { sign: '+', cls: 'in', verb: 'Add', p: b.add },
      ...(b.drop ? [{ sign: '−', cls: 'out', verb: 'Drop', p: b.drop }] : []),
    ]
    : b.kind === 'swap' ? [
      { sign: '↑', cls: 'in', verb: 'Start', p: b.start },
      { sign: '↓', cls: 'out', verb: 'Bench', p: b.bench },
    ]
    : [{
      sign: b.call === 'start' ? '↑' : b.call === 'sit' ? '↓' : '•',
      cls: b.call === 'start' ? 'in' : b.call === 'sit' ? 'out' : 'unk',
      verb: b.call === 'start' ? 'Start' : b.call === 'sit' ? 'Sit' : 'Watch',
      p: b.player,
    }];

  return (
    <ul className="moves">
      {rows.map((r) => (
        <li key={r.verb + r.p.key}>
          <span className={`move-sign ${r.cls}`} aria-hidden="true">{r.sign}</span>
          <span className="move-verb">{r.verb}</span>
          <span className="move-name">{r.p.name}</span>
          <span className="pmeta">{[r.p.team, r.p.pos].filter(Boolean).join(' · ')}</span>
        </li>
      ))}
    </ul>
  );
}

const chipClass = (s: Suggestion) =>
  s.state === 'open' ? 'unk' : s.state === 'done' ? 'in' : 'dim';

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export function SuggestionRow({ s, onOpen, compact = false }: { s: Suggestion; onOpen?: () => void; compact?: boolean }) {
  const reaction = reactionLine(s);
  const bits = [
    s.mine ? 'You' : s.authorName,
    ago(s.updatedAt),
    s.date && s.state === 'open' ? dayWord(s.date) : null,
  ].filter(Boolean).join(' · ');

  const inner = (
    <>
      <div className="item-top">
        {s.unread ? <span className="unread-dot" aria-label="New" /> : null}
        <span className="pname sugg-head">{headline(s.body)}</span>
        {s.state !== 'open' ? <span className={`chip ${chipClass(s)}`}>{STATE_LABEL[s.state]}</span> : null}
      </div>
      {!compact && s.note ? <p className="verdict sugg-note-line">{s.note}</p> : null}
      <p className="sugg-foot">
        <span>{KIND_LABEL[s.body.kind]} · {bits}</span>
        {reaction ? <span className={s.reactions[0]?.value === 'disagree' ? 'neg' : 'pos'}>{reaction}</span> : null}
        {s.replies.some((r) => r.counter) ? <span className="countered">Countered</span> : null}
        {s.replies.length ? <span>{s.replies.length} {s.replies.length === 1 ? 'reply' : 'replies'}</span> : null}
      </p>
    </>
  );

  const cls = `item ${tone(s)}${s.unread ? ' unread' : ''}`;
  return onOpen ? (
    <button className={`${cls} item-button sugg-row`} onClick={onOpen}>{inner}</button>
  ) : (
    <div className={`${cls} sugg-row`}>{inner}</div>
  );
}

/** The other owner's name, learned from anything they've sent; a generic fallback until then. */
let lastKnownPartner: string | null = null;

export function partnerName(list: Suggestion[] | null | undefined): string {
  const mine = list?.filter((s) => s.mine) ?? [];
  const theirs =
    list?.find((s) => !s.mine)?.authorName
    // Nothing from them yet: their reaction or reply on one of yours.
    ?? mine.find((s) => s.reactions[0])?.reactions[0].name
    ?? mine.flatMap((s) => s.replies.filter((r) => r.email !== s.authorEmail))[0]?.name;
  if (theirs) lastKnownPartner = theirs.split(' ')[0];
  return lastKnownPartner ?? 'your co-owner';
}

/** For places that don't load the list themselves (a player card). Home loads it on launch. */
export const knownPartner = () => lastKnownPartner ?? 'your co-owner';
