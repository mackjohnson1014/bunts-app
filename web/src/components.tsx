import type { ReactNode } from 'react';
import type { Player } from './types';

export function Screen({
  title, subtitle, loading, error, onReload, children,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="screen-title">{title}</h1>
        {subtitle ? <p className="screen-sub">{subtitle}</p> : null}
      </div>

      {error ? (
        <div className="stack">
          <p style={{ margin: 0, color: 'var(--clay)' }}>{error}</p>
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
