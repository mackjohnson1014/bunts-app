import { useEffect } from 'react';
import { Composer, knownPartner } from './Suggestions';
import type { AcquisitionHow, GameLine, Player, PlayerMove } from './types';

/**
 * Full detail for one player, as a bottom sheet. A roster row can only carry a
 * name, a slot and five numbers; everything that explains *why* a player is
 * worth starting or keeping lives here.
 */
export function PlayerSheet({
  player, onClose, onSuggested, readOnly = false,
}: {
  player: Player | null;
  onClose: () => void;
  onSuggested?: () => void;
  /** Someone else's player (the opponent's): nothing to suggest to the co-owner. */
  readOnly?: boolean;
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
          {recentG === 0 ? (
            <p className="muted">No games in the last 14 days.</p>
          ) : (
          <>
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
          </>
          )}

          <p className="sect">On our team</p>
          <OnOurTeam player={player} keys={keys} />

          <p className="sect">Transaction history</p>
          <History moves={player.history} />

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

          {readOnly ? null : (
            <>
              <p className="sect">Suggest a move to {knownPartner()}</p>
              <Composer
                key={player.playerKey}
                preset={{ player }}
                partner={knownPartner()}
                onSent={() => { onSuggested?.(); onClose(); }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const HOW: Record<AcquisitionHow, string> = {
  draft: 'Drafted',
  keeper: 'Kept',
  waiver: 'Waivers',
  'free-agent': 'Free agent',
  trade: 'Trade',
};

/**
 * What he has done for US, not his season. A player picked up in July has a
 * season line that is mostly someone else's; this isolates the part that
 * counted for our team, and shows how big a share of his season that is.
 */
function OnOurTeam({ player, keys }: { player: Player; keys: string[] }) {
  const a = player.acquired;
  if (!a) {
    return <p className="muted">When and how he joined isn&rsquo;t known yet &mdash; this fills in once Yahoo is connected.</p>;
  }

  const joined = new Date(a.date + 'T12:00:00');
  const now = new Date();
  const days = Math.max(0, Math.floor((now.getTime() - joined.getTime()) / 86_400_000));
  const joinedStr = joined.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    ...(joined.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });

  // Drafted and kept players' whole season is ours.
  const wholeSeason = a.how === 'draft' || a.how === 'keeper';
  const withUs = wholeSeason ? player.seasonStats : player.withUsStats;
  const gamesWithUs = withUs?.G ?? 0;

  const RATE = new Set(['AVG', 'ERA', 'WHIP']);
  const lowerIsBetter = new Set(['ERA', 'WHIP']);
  const share = (w?: number, s?: number) =>
    w === undefined || !s ? '–' : `${Math.round((w / s) * 100)}%`;

  return (
    <>
      <div className="tonight">
        <div>
          <span className="k">How</span>
          <span className="v">{HOW[a.how]}</span>
        </div>
        <div>
          <span className="k">Joined</span>
          <span className="v">{joinedStr}</span>
        </div>
        <div>
          <span className="k">With us</span>
          <span className="v">{days} days · {gamesWithUs} G</span>
        </div>
      </div>
      {a.detail ? <p className="muted" style={{ marginTop: 6 }}>{a.detail}</p> : null}

      {!withUs || gamesWithUs === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>No games for us yet.</p>
      ) : wholeSeason ? (
        <p className="muted" style={{ marginTop: 8 }}>
          He&rsquo;s been ours all season, so his whole season line counted for us.
        </p>
      ) : (
        <>
          <table className="compare" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Cat</th>
                <th>With us</th>
                <th>Season</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {['G', ...keys].map((k) => {
                const w = withUs[k];
                const s = player.seasonStats[k];
                return (
                  <tr key={k}>
                    <td className="cat">{k}</td>
                    <td>{fmt(w)}</td>
                    <td className="expected">{fmt(s)}</td>
                    <td>{RATE.has(k) ? arrow(s, w, lowerIsBetter.has(k)) : <span className="expected">{share(w, s)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 6 }}>
            Share is how much of his season total came while he was ours &mdash; compare
            it to his share of games. AVG, ERA and WHIP compare his rate with us to his full season.
          </p>
        </>
      )}
    </>
  );
}

/** Who has owned him this season, newest first; our own moves highlighted. */
function History({ moves }: { moves?: PlayerMove[] }) {
  if (!moves) {
    return <p className="muted">His moves between teams this season show up once Yahoo is connected.</p>;
  }
  if (moves.length === 0) return <p className="muted">No moves this season.</p>;
  return (
    <ul className="history">
      {moves.map((m, i) => (
        <li key={i} className={m.ours ? 'ours' : undefined}>
          <span className="h-date">{shortDate(m.date)}</span>
          <span className="h-text">
            {moveText(m)}
            {m.detail ? <span className="h-detail">{m.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function moveText(m: PlayerMove): string {
  switch (m.kind) {
    case 'drafted': return `Drafted by ${m.toTeam}`;
    case 'kept': return `Kept by ${m.toTeam}`;
    case 'added': return `Added by ${m.toTeam} from free agents`;
    case 'claimed': return `Claimed off waivers by ${m.toTeam}`;
    case 'dropped': return `Dropped by ${m.fromTeam}`;
    case 'traded': return `Traded to ${m.toTeam} from ${m.fromTeam}`;
  }
}

const shortDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

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
