import type { ReactNode } from 'react';
import { isWaitingOnYahoo } from './api';
import type { GameLine, Player } from './types';

export function Screen({
  title, subtitle, loading, error, onReload, sample, updatedAt, children,
}: {
  title: string;
  subtitle?: ReactNode;
  loading?: boolean;
  error?: unknown;
  onReload?: () => void;
  sample?: boolean;
  updatedAt?: string | null;
  children: ReactNode;
}) {
  const waiting = isWaitingOnYahoo(error);
  const message = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="screen-titlerow">
          <h1 className="screen-title">{title}</h1>
          {sample ? <span className="sample-tag">Sample data</span> : null}
        </div>
        {subtitle ? <p className="screen-sub">{subtitle}</p> : null}
        {onReload && !loading ? (
          <button className="refresh" onClick={onReload}>
            {updatedAt ? `Updated ${ago(updatedAt)}` : 'Refresh'}
          </button>
        ) : null}
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

      <p className="attribution">Fantasy data provided by Yahoo Fantasy</p>
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

export function PlayerRow({ player, onOpen }: { player: Player; onOpen?: (p: Player) => void }) {
  const keys = isPitcher(player) ? PITCHER_KEYS : HITTER_KEYS;

  const body = (
    <>
      <div className="slot">{player.slot}</div>
      <div className="row-main">
        <div className="pname">
          {player.name}
          {player.status ? <> <span className="chip dtd">{player.status}</span></> : null}
        </div>
        <div className="sub">
          {player.mlbTeam} · {player.positions.join('/')}
          {player.opponent ? ` · ${player.opponent}` : ''}
        </div>
        <div className="statline">
          {keys.filter((k) => player.seasonStats[k] !== undefined).map((k) => (
            <span key={k}><b>{fmt(player.seasonStats[k])}</b> {k}</span>
          ))}
          <FormStrip games={player.recentGames} />
        </div>
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

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}
