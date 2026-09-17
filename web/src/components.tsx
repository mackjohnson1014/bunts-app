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

export const HITTER_KEYS = ['AVG', 'R', 'HR', 'RBI', 'SB'];
export const PITCHER_KEYS = ['W', 'ERA', 'K', 'WHIP', 'SV'];

export const isPitcher = (p: Player) => p.positions.some((x) => x === 'SP' || x === 'RP' || x === 'P');

export const fmt = (v: number | undefined) => {
  if (v === undefined) return '–';
  return v < 10 && !Number.isInteger(v) ? v.toFixed(3).replace(/^0/, '') : String(v);
};

/** ERA and WHIP read best to two decimals, e.g. "3.45" / "0.98" -- unlike
 * AVG, they keep the leading digit rather than dropping it, since a WHIP
 * under 1 is a real (if rare) value, not a fraction-of-one convention. */
const TWO_DECIMAL_STATS = new Set(['ERA', 'WHIP']);

/** Stat-column formatter: same as fmt(), except ERA/WHIP get their own
 * two-decimal treatment instead of the general three-decimal one. */
export const fmtStat = (key: string, v: number | undefined) => {
  if (v === undefined) return '–';
  return TWO_DECIMAL_STATS.has(key) ? v.toFixed(2) : fmt(v);
};

/** ERA and WHIP are the only stats where a lower number is the better one --
 * everything else (AVG, counting stats) is better the higher it goes. Shared
 * between the roster's default sort direction and its week-vs-season trend. */
export const LOWER_IS_BETTER = new Set(['ERA', 'WHIP']);

/** Rate stats compare directly to the season figure; counting stats do not --
 * a single week's HR total being lower than a whole season's says nothing
 * except that a week is shorter than a season. Those get compared against
 * the player's own season rate projected over however many games he played
 * THIS week -- "is he beating his own pace" -- the same convention the
 * player detail sheet already uses for last-14-days vs. season. */
const RATE_STATS = new Set(['AVG', 'ERA', 'WHIP']);

/**
 * Whether this week's line is ahead of, behind, or even with the player's
 * season-long form -- undefined when there's nothing to compare (no games
 * yet this week, or no season/games-played baseline to project from).
 */
function weekTrend(key: string, player: Player): 'better' | 'worse' | undefined {
  const actual = player.weekStats?.[key];
  const season = player.seasonStats[key];
  if (actual === undefined || season === undefined) return undefined;

  let expected = season;
  if (!RATE_STATS.has(key)) {
    const seasonG = player.seasonStats.G ?? 0;
    const weekG = player.weekStats?.G ?? 0;
    if (seasonG === 0 || weekG === 0) return undefined;
    expected = (season / seasonG) * weekG;
  }
  if (actual === expected) return undefined;
  const higherIsBetter = !LOWER_IS_BETTER.has(key);
  return (actual > expected) === higherIsBetter ? 'better' : 'worse';
}

/** Longer names (hyphenated surnames especially) would otherwise wrap onto
 * a second line next to the team/position/opponent subtext -- shrink the
 * font instead so every row stays one line tall. */
function pnameSize(name: string): number {
  if (name.length > 21) return 12.5;
  if (name.length > 16) return 13.5;
  return 15;
}

/**
 * Fantasy-lineup status (starting slot / bench / IL) is read straight off
 * `player.slot` -- as current as the last roster fetch, since Bunts has no
 * write access: set the lineup in the Yahoo app and this follows on the
 * next refresh. Rather than a second "LU/BN" light next to the slot text,
 * the slot chip itself carries the color, so each row states this once.
 */
const slotTone = (slot: Player['slot']) =>
  STARTING_SLOTS.includes(slot) ? 'active' : slot === 'BN' ? 'bench' : 'inactive';

/**
 * Sticks to the top of the scrolling screen as the roster list scrolls
 * under it. Mirrors `.row`'s own grid (slot/avatar/main/state columns) with
 * two empty spacer cells so its category labels land exactly above the
 * same-width number columns every row lines up beneath it -- see `.statcol`.
 * Each label doubles as a sort button; the active one shows which way.
 */
export function StatHeader({
  keys, sortKey, sortDir, onSort,
}: {
  keys: string[];
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}) {
  return (
    <div className="stat-header">
      <div aria-hidden="true" />
      <div aria-hidden="true" />
      <div className="statcols">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className={`statcol${sortKey === k ? ' active' : ''}`}
            aria-pressed={sortKey === k}
            onClick={() => onSort(k)}
          >
            {k}{sortKey === k ? (sortDir === 'desc' ? '▾' : '▴') : ''}
          </button>
        ))}
      </div>
      <div aria-hidden="true" />
    </div>
  );
}

export function PlayerRow({ player, onOpen }: { player: Player; onOpen?: (p: Player) => void }) {
  const keys = isPitcher(player) ? PITCHER_KEYS : HITTER_KEYS;

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
        {/* identity: who (plus any injury/role flag), and context -- team,
            eligible positions, tonight's matchup -- on the same line. .sub
            shrinks and ellipsizes rather than wrapping when space is tight. */}
        <div className="row-top">
          <div className="pname" style={{ fontSize: pnameSize(player.name) }}>
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
          <div className="sub">
            {player.mlbTeam} · {player.positions.join('/')}
            {player.opponent ? ` · ${player.opponent}` : ''}
          </div>
        </div>
        {/* performance: just the counts -- the category labels live in the
            sticky StatHeader above the list, not repeated on every row --
            then the five-game trend. Every row renders all of `keys`, in
            the same order, so a column always lines up under its header
            even when a player is missing one of the stats (fmt() gives
            the empty ones a plain "-"). */}
        <div className="row-bottom">
          <div className="statcols">
            {keys.map((k) => (
              <span key={k} className="statcol">{fmtStat(k, player.seasonStats[k])}</span>
            ))}
          </div>
          <FormStrip games={player.recentGames} />
        </div>
        {/* This week (Mon-Sun so far) vs. his own season pace, so a hot or
            cold stretch stands out without having to open the player sheet.
            Same fixed-width columns as the season row above, so it lines up
            under the same sticky header -- only the color (and arrow) is new. */}
        <div className="row-week">
          <div className="statcols">
            {keys.map((k) => {
              const trend = weekTrend(k, player);
              return (
                <span key={k} className={`statcol${trend ? ` trend-${trend}` : ''}`}>
                  {fmtStat(k, player.weekStats?.[k])}{trend === 'better' ? ' ▲' : trend === 'worse' ? ' ▼' : ''}
                </span>
              );
            })}
          </div>
          <span className="row-week-label" title="This week vs. his season pace">this wk</span>
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

const noop = () => {};

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}
