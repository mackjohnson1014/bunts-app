import type { ReactNode } from 'react';
import { isWaitingOnYahoo } from './api';
import { STARTING_SLOTS } from './types';
import type { GameLine, Player } from './types';
import { useRefreshOnFocus } from './useRefresh';

export function Screen({
  title, subtitle, loading, error, onReload, onBack, sample, updatedAt, children,
}: {
  title: string;
  subtitle?: ReactNode;
  loading?: boolean;
  error?: unknown;
  onReload?: () => void;
  /** Renders a back link before the title, for a screen pushed from a list (e.g. a Settings section). */
  onBack?: () => void;
  sample?: boolean;
  updatedAt?: string | null;
  children: ReactNode;
}) {
  const waiting = isWaitingOnYahoo(error);
  const message = error instanceof Error ? error.message : error ? String(error) : null;

  // Coming back to a suspended app should not show yesterday's roster.
  useRefreshOnFocus(onReload ?? noop);

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="screen-titlerow">
          {onBack ? (
            <button className="back-btn" onClick={onBack} aria-label="Back">
              <span className="back-chevron" aria-hidden="true">‹</span>Back
            </button>
          ) : null}
          <h1 className="screen-title">{title}</h1>
          {sample ? <span className="sample-tag">Sample data</span> : null}
          {onReload ? (
            <button
              className={`refresh-btn${loading ? ' spinning' : ''}`}
              onClick={onReload}
              disabled={loading}
              aria-label="Refresh"
              title="Refresh"
            >
              ↻
            </button>
          ) : null}
        </div>
        {subtitle ? <p className="screen-sub">{subtitle}</p> : null}
        {updatedAt && !loading ? <p className="updated">Updated {ago(updatedAt)}</p> : null}
      </div>

      {waiting || message ? (
        <div className="stack">
          <p style={{ margin: 0, color: waiting ? 'var(--amber)' : 'var(--clay)' }}>
            {waiting ? 'Waiting on Yahoo to switch on API access.' : message}
          </p>
          {onReload ? <button className="btn ghost" onClick={onReload}>Try again</button> : null}
        </div>
      ) : loading ? (
        <Skeleton />
      ) : (
        children
      )}

      <p className="attribution">
        {sample ? 'Player data from MLB Stats API' : 'Fantasy data provided by Yahoo Fantasy'}
      </p>
    </div>
  );
}

/** Shaped like the content it replaces, so the page does not jump on load. */
function Skeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div className="skel-card" key={i}>
          <div className="skel-line" style={{ width: '55%' }} />
          <div className="skel-line" style={{ width: '80%' }} />
          <div className="skel-line" style={{ width: '35%' }} />
        </div>
      ))}
    </div>
  );
}

/** Three states, never two. Null is "no lineup posted", not "benched". */
export function LineupState({ starting }: { starting: boolean | null }) {
  const { color, label } =
    starting === true ? { color: 'var(--grass)', label: 'IN' }
    : starting === false ? { color: 'var(--clay)', label: 'OUT' }
    : { color: 'var(--amber)', label: '—' };

  return (
    <div className="state">
      <div className="dot" style={{ background: color }} />
      <div className="lbl" style={{ color }}>{label}</div>
    </div>
  );
}

/** Five games at a glance. Oldest on the left, so it reads as a trend. */
export function FormStrip({ games }: { games: GameLine[] }) {
  if (games.length === 0) return null;
  return (
    <span className="form-strip" aria-label="Recent form">
      {[...games].reverse().map((g, i) => <span key={i} className={`pip ${g.quality}`} />)}
    </span>
  );
}

const HITTER_KEYS = ['R', 'HR', 'RBI', 'SB', 'AVG'];
const PITCHER_KEYS = ['W', 'SV', 'K', 'ERA', 'WHIP'];

export const isPitcher = (p: Player) => p.positions.some((x) => x === 'SP' || x === 'RP' || x === 'P');

export const fmt = (v: number | undefined) => {
  if (v === undefined) return '–';
  return v < 10 && !Number.isInteger(v) ? v.toFixed(3).replace(/^0/, '') : String(v);
};

/**
 * Fantasy-lineup status (starting slot / bench / IL) is read straight off
 * `player.slot` -- as current as the last roster fetch, since Bunts has no
 * write access: set the lineup in the Yahoo app and this follows on the
 * next refresh. Rather than a second "LU/BN" light next to the slot text,
 * the slot chip itself carries the color, so each row states this once.
 */
const slotTone = (slot: Player['slot']) =>
  STARTING_SLOTS.includes(slot) ? 'active' : slot === 'BN' ? 'bench' : 'inactive';

export function PlayerRow({ player, onOpen }: { player: Player; onOpen?: (p: Player) => void }) {
  const keys = isPitcher(player) ? PITCHER_KEYS : HITTER_KEYS;
  const stats = keys.filter((k) => player.seasonStats[k] !== undefined);

  const body = (
    <>
      <div className={`slot slot-${slotTone(player.slot)}`}>{player.slot}</div>
      {player.headshotUrl ? (
        <img
          className="row-avatar"
          src={player.headshotUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />
      ) : (
        <div className="row-avatar" aria-hidden="true" />
      )}
      <div className="row-main">
        {/* identity: who, and any injury/role flag */}
        <div className="row-top">
          <div className="pname">
            {player.name}
            {/* Whether a probable starter is even taking the mound today is
                the single most decision-relevant fact on a pitcher's row --
                worth a badge right next to the name, not just the small
                state light on the right that every row already carries. */}
            {isPitcher(player) && player.startingToday ? (
              <> <span className="chip in" aria-label="Probable starter today">✓ Start</span></>
            ) : null}
            {player.status ? <> <span className="chip dtd">{player.status}</span></> : null}
          </div>
        </div>
        {/* context: team, eligible positions, tonight's matchup */}
        <div className="sub">
          {player.mlbTeam} · {player.positions.join('/')}
          {player.opponent ? ` · ${player.opponent}` : ''}
        </div>
        {/* performance: season line, then five-game trend */}
        {stats.length > 0 || player.recentGames.length > 0 ? (
          <div className="row-bottom">
            <div className="statline">
              {stats.map((k) => (
                <span key={k}><b>{fmt(player.seasonStats[k])}</b> {k}</span>
              ))}
            </div>
            <FormStrip games={player.recentGames} />
          </div>
        ) : null}
      </div>
      <LineupState starting={player.startingToday} />
    </>
  );

  if (!onOpen) return <div className="row">{body}</div>;

  return (
    <button className="row row-button" onClick={() => onOpen(player)} aria-label={`Details for ${player.name}`}>
      {body}
    </button>
  );
}

const noop = () => {};

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}
