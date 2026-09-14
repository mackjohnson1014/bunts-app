import { useEffect } from 'react';
import type { GameLine, Player } from './types';

/**
 * Full detail for one player, as a bottom sheet. A roster row can only carry a
 * name, a slot and five numbers; everything that explains *why* a player is
 * worth starting or keeping lives here.
 */
export function PlayerSheet({ player, onClose }: { player: Player | null; onClose: () => void }) {
  useEffect(() => {
    if (!player) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Stop the screen behind from scrolling while the sheet is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [player, onClose]);

  if (!player) return null;

  const isPitcher = player.positions.some((p) => p === 'SP' || p === 'RP' || p === 'P');
  const keys = isPitcher ? ['W', 'SV', 'K', 'ERA', 'WHIP'] : ['R', 'HR', 'RBI', 'SB', 'AVG'];
  // For rate stats a lower number is the better one; everything else is counting.
  const lowerIsBetter = new Set(['ERA', 'WHIP']);

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={player.name}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab" aria-hidden="true" />

        <div className="sheet-head">
          <div>
            <h2 className="sheet-name">{player.name}</h2>
            <p className="sheet-meta">
              {player.mlbTeam} · {player.positions.join('/')} · slot {player.slot}
              {player.percentOwned != null ? ` · ${player.percentOwned}% rostered` : ''}
            </p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="sheet-body">
          <p className="sect">Tonight</p>
          <div className="tonight">
            <div>
              <span className="k">Status</span>
              <span className={`v ${lineupClass(player.startingToday)}`}>{lineupWord(player.startingToday)}</span>
            </div>
            <div>
              <span className="k">Opponent</span>
              <span className="v">{player.opponent ?? 'No game'}</span>
            </div>
            <div>
              <span className="k">{isPitcher ? 'Role' : 'Opposing SP'}</span>
              <span className="v">{isPitcher ? (player.startingToday ? 'Starting' : 'Bullpen') : player.opposingPitcher ?? '—'}</span>
            </div>
          </div>

          {player.note ? (
            <div className="item pending" style={{ marginTop: 12 }}>
              <p className="verdict" style={{ marginTop: 0 }}>{player.note}</p>
            </div>
          ) : null}

          <p className="sect">Season vs last 14 days</p>
          <table className="compare">
            <thead>
              <tr><th>Cat</th><th>Season</th><th>Last 14</th><th aria-label="Direction" /></tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const season = player.seasonStats[k];
                const recent = player.last14Stats[k];
                return (
                  <tr key={k}>
                    <td className="cat">{k}</td>
                    <td>{fmt(season)}</td>
                    <td>{fmt(recent)}</td>
                    <td>{arrow(season, recent, lowerIsBetter.has(k))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="sect">Last five games</p>
          {player.recentGames.length === 0 ? (
            <p className="muted">No recent appearances.</p>
          ) : (
            <>
              <div className="form-strip" aria-hidden="true">
                {[...player.recentGames].reverse().map((g, i) => (
                  <span key={i} className={`pip ${g.quality}`} />
                ))}
              </div>
              <ul className="gamelog">
                {player.recentGames.map((g) => <GameRow key={g.date} game={g} />)}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GameRow({ game }: { game: GameLine }) {
  const date = new Date(game.date + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return (
    <li className={game.quality}>
      <span className="g-date">{date}</span>
      <span className="g-opp">{game.opponent}</span>
      <span className="g-line">{game.summary}</span>
    </li>
  );
}

const fmt = (v: number | undefined) => {
  if (v === undefined) return '–';
  return v < 10 && !Number.isInteger(v) ? v.toFixed(3).replace(/^0/, '') : String(v);
};

/** Direction of travel, not a judgement of size. */
function arrow(season?: number, recent?: number, lowerBetter = false) {
  if (season === undefined || recent === undefined) return <span className="flat">·</span>;
  const better = lowerBetter ? recent < season : recent > season;
  const worse = lowerBetter ? recent > season : recent < season;
  if (better) return <span className="up">▲</span>;
  if (worse) return <span className="down">▼</span>;
  return <span className="flat">·</span>;
}

const lineupWord = (s: boolean | null) => (s === true ? 'In the lineup' : s === false ? 'Not starting' : 'Not posted yet');
const lineupClass = (s: boolean | null) => (s === true ? 'good' : s === false ? 'bad' : 'warn');
