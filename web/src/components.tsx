import type { ReactNode } from 'react';
import { isWaitingOnYahoo } from './api';
import type { Player } from './types';

export function Screen({
  title, subtitle, loading, error, onReload, children,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: unknown;
  onReload?: () => void;
  children: ReactNode;
}) {
  const waiting = isWaitingOnYahoo(error);
  const message = error instanceof Error ? error.message : error ? String(error) : null;
  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="screen-title">{title}</h1>
        {subtitle ? <p className="screen-sub">{subtitle}</p> : null}
      </div>

      {waiting ? (
        <div className="item pending">
          <div className="item-top"><span className="pname">Waiting on Yahoo</span></div>
          <p className="verdict">
            Yahoo approved API access but has not switched it on yet. Until it does,
            there is no roster to show.
          </p>
          <p className="verdict" style={{ color: 'var(--chalk-dim)' }}>
            Nothing is broken and there is nothing to do — alerts will start on their own.
          </p>
        </div>
      ) : message ? (
        <div className="stack">
          <p style={{ margin: 0, color: 'var(--clay)' }}>{message}</p>
          {onReload ? (
            <button className="btn ghost" onClick={onReload}>Try again</button>
          ) : null}
        </div>
      ) : loading ? (
        <p className="center">Loading…</p>
      ) : (
        children
      )}

      <p className="attribution">Fantasy data provided by Yahoo Fantasy</p>
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

const HITTER_KEYS = ['R', 'HR', 'RBI', 'SB', 'AVG'];
const PITCHER_KEYS = ['W', 'SV', 'K', 'ERA', 'WHIP'];

const fmt = (v: number | undefined) => {
  if (v === undefined) return '–';
  return v < 10 && !Number.isInteger(v) ? v.toFixed(3).replace(/^0/, '') : String(v);
};

export function PlayerRow({ player }: { player: Player }) {
  const isPitcher = player.positions.some((p) => p === 'SP' || p === 'RP' || p === 'P');
  const keys = isPitcher ? PITCHER_KEYS : HITTER_KEYS;
  const line = keys
    .filter((k) => player.seasonStats[k] !== undefined)
    .map((k) => `${fmt(player.seasonStats[k])} ${k}`)
    .join(' · ');

  return (
    <div className="row">
      <div className="slot">{player.slot}</div>
      <div>
        <div className="pname">
          {player.name}
          {player.status ? <> <span className="chip dtd">{player.status}</span></> : null}
        </div>
        <div className="sub">
          {player.mlbTeam} · {player.positions.join('/')}
          {player.opponent ? ` · ${player.opponent}` : ''}
        </div>
        <div className="statline">{line}</div>
      </div>
      <LineupState starting={player.startingToday} />
    </div>
  );
}
