import { useEffect, useState } from 'react';
import { api } from './api';
import type { GameLine, Player, SuggestionInput } from './types';

/**
 * Full detail for one player, as a bottom sheet. A roster row can only carry a
 * name, a slot and five numbers; everything that explains *why* a player is
 * worth starting or keeping lives here.
 */
export function PlayerSheet({
  player, onClose, onSuggested,
}: {
  player: Player | null;
  onClose: () => void;
  onSuggested?: () => void;
}) {
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

  // Rate stats compare directly; counting stats do not. Comparing 79 runs in a
  // season against 5 in a fortnight says nothing except that a fortnight is
  // shorter. So counting stats are compared against the player's OWN season
  // rate projected over the same number of games -- "is he beating himself".
  const RATE = new Set(['AVG', 'ERA', 'WHIP']);
  const lowerIsBetter = new Set(['ERA', 'WHIP']);
  const seasonG = player.seasonStats.G ?? 0;
  const recentG = player.last14Stats.G ?? 0;
  const canPace = seasonG > 0 && recentG > 0;

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
          {player.headshotUrl ? (
            <img
              className="sheet-avatar"
              src={player.headshotUrl}
              alt=""
              aria-hidden="true"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : null}
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

          {!isPitcher && player.opposingPitcher ? (
            <>
              <p className="sect">Career vs {player.opposingPitcher}</p>
              {player.vsPitcher ? (
                <div className="tonight">
                  <div>
                    <span className="k">AVG</span>
                    <span className="v">{fmt(player.vsPitcher.avg)}</span>
                  </div>
                  <div>
                    <span className="k">AB · H · HR</span>
                    <span className="v">{player.vsPitcher.atBats}-{player.vsPitcher.hits}-{player.vsPitcher.homeRuns}</span>
                  </div>
                  <div>
                    <span className="k">BB · K</span>
                    <span className="v">{player.vsPitcher.walks}-{player.vsPitcher.strikeOuts}</span>
                  </div>
                </div>
              ) : (
                <p className="muted">No career at-bats against him.</p>
              )}
            </>
          ) : null}

          <p className="sect">Last 14 days</p>
          <table className="compare">
            <thead>
              <tr>
                <th>Cat</th>
                <th>Actual</th>
                <th>{'Expected'}</th>
                <th aria-label="Direction" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const season = player.seasonStats[k];
                const recent = player.last14Stats[k];
                const isRate = RATE.has(k);

                // Rate stats: the season figure is the fair benchmark.
                // Counting stats: his own season rate over these many games.
                const expected =
                  isRate ? season
                  : canPace && season !== undefined ? (season / seasonG) * recentG
                  : undefined;

                return (
                  <tr key={k}>
                    <td className="cat">{k}</td>
                    <td>{fmt(recent)}</td>
                    <td className="expected">{expected === undefined ? '–' : fmt(round(expected))}</td>
                    <td>{arrow(expected, recent, lowerIsBetter.has(k))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 6 }}>
            Expected is his own season rate over the same {recentG || 0} games — so an
            arrow means beating or trailing himself, not the league.
          </p>

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

          <Compose player={player} onSent={() => { onSuggested?.(); onClose(); }} />
        </div>
      </div>
    </div>
  );
}

const RECS: { id: SuggestionInput['recommendation']; label: string }[] = [
  { id: 'start', label: 'Start him' },
  { id: 'sit', label: 'Sit him' },
  { id: 'watch', label: 'Keep an eye' },
];

/** Send a call to the co-owner. Their phone buzzes; yours does not. */
function Compose({ player, onSent }: { player: Player; onSent: () => void }) {
  const [rec, setRec] = useState<SuggestionInput['recommendation']>('start');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await api.addSuggestion({
        playerKey: player.playerKey,
        playerName: player.name,
        recommendation: rec,
        note: note.trim(),
      });
      setResult(res.notified > 0 ? 'Sent — their phone just buzzed.' : 'Sent. They have no device registered yet.');
      setNote('');
      setTimeout(onSent, 900);
    } catch (e) {
      setResult(e instanceof Error ? e.message : String(e));
    }
    setSending(false);
  }

  return (
    <>
      <p className="sect">Tell your co-owner</p>
      <div className="segmented" role="radiogroup" aria-label="Recommendation">
        {RECS.map((r) => (
          <button
            key={r.id}
            role="radio"
            aria-checked={rec === r.id}
            aria-selected={rec === r.id}
            className="seg"
            onClick={() => setRec(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        id="suggestion-note"
        className="note-input"
        placeholder={`Why ${player.name.split(' ')[0]}? (optional)`}
        value={note}
        maxLength={280}
        rows={2}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="btn" onClick={send} disabled={sending}>
        {sending ? 'Sending…' : 'Send suggestion'}
      </button>
      {result ? <p className="muted" style={{ marginTop: 8 }}>{result}</p> : null}
    </>
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

/** One decimal for a projected counting stat; whole numbers stay whole. */
const round = (v: number) => (Number.isInteger(v) ? v : Math.round(v * 10) / 10);

const fmt = (v: number | undefined) => {
  if (v === undefined) return '–';
  return v < 10 && !Number.isInteger(v) ? v.toFixed(3).replace(/^0/, '') : String(v);
};

/**
 * Direction against the benchmark. A 5% band counts as level -- otherwise
 * every row gets an arrow and the arrows stop meaning anything.
 */
function arrow(expected?: number, actual?: number, lowerBetter = false) {
  if (expected === undefined || actual === undefined || expected === 0) {
    return <span className="flat">·</span>;
  }
  const delta = (actual - expected) / Math.abs(expected);
  if (Math.abs(delta) < 0.05) return <span className="flat">·</span>;
  const better = lowerBetter ? delta < 0 : delta > 0;
  return better ? <span className="up">▲</span> : <span className="down">▼</span>;
}

const lineupWord = (s: boolean | null) => (s === true ? 'In the lineup' : s === false ? 'Not starting' : 'Not posted yet');
const lineupClass = (s: boolean | null) => (s === true ? 'good' : s === false ? 'bad' : 'warn');
