import { useState } from 'react';
import { api } from '../api';
import { Screen } from '../components';
import { OpponentSheet } from '../OpponentSheet';
import { formatStat, metaFor } from '../scoring/categories';
import { categoryStates, type CategoryState } from '../scoring/leverage';
import { weekScore } from '../scoring/h2h';
import { weekOdds } from '../scoring/winprob';
import { useAsync } from '../useAsync';

/**
 * The week, category by category. In head-to-head this is the scoreboard every
 * other decision hangs off: a lineup change only matters if it moves a category
 * that is still live.
 *
 * Laid out like a scoreboard: Bunts on the left, the opponent on the right,
 * and how close each category is sitting in the middle between them.
 */
export default function MatchupScreen() {
  const roster = useAsync(() => api.getRoster());
  const matchup = useAsync(() => api.getMatchup());
  const [showOpponent, setShowOpponent] = useState(false);

  const states =
    matchup.data && roster.data ? categoryStates(matchup.data, roster.data.players) : [];

  const score = weekScore(states);
  const live = states.filter((s) => s.status === 'live' || s.status === 'tied');
  const decided = states.filter((s) => s.status === 'won' || s.status === 'lost');

  const odds = matchup.data && states.length > 0
    ? weekOdds(states, matchup.data.daysRemaining)
    : null;

  return (
    <>
    <Screen
      title="Matchup"
      subtitle={
        matchup.data
          ? `Week ${matchup.data.week} vs ${matchup.data.opponentName} · ${matchup.data.daysRemaining} ${matchup.data.daysRemaining === 1 ? 'day' : 'days'} left`
          : undefined
      }
      sample={roster.data?.sample}
      loading={roster.loading || matchup.loading}
      error={roster.error ?? matchup.error}
      onReload={() => { roster.reload(); matchup.reload(); }}
    >
      {states.length > 0 && matchup.data ? (
        <>
          {/* Head-to-head: the week is one result, decided by categories won,
              so the score if it ended now is the headline. Columns line up
              with the rings below: ours left, theirs right. */}
          <div className="mu-teams">
            <span className="mu-team mine">Bunts</span>
            <span />
            <button className="mu-team theirs mu-opp" onClick={() => setShowOpponent(true)}>
              {matchup.data.opponentName}<span className="mu-chev" aria-hidden="true">›</span>
            </button>
          </div>
          <div className="mu-score" aria-label={`Bunts ${score.mine}, ${matchup.data.opponentName} ${score.theirs}, ${score.ties} tied`}>
            <span className={`mu-n mine${score.mine > score.theirs ? ' lead' : ''}`}>{score.mine}</span>
            <div className="mu-score-mid">
              <span className={`chip ${score.mine > score.theirs ? 'in' : score.mine < score.theirs ? 'out' : 'unk'}`}>
                {score.mine > score.theirs ? 'Leading' : score.mine < score.theirs ? 'Trailing' : 'Level'}
              </span>
              <span className="mu-score-k">
                {score.ties > 0 ? `${score.ties} tied · ` : ''}if it ended now
              </span>
            </div>
            <span className={`mu-n theirs${score.theirs > score.mine ? ' lead' : ''}`}>{score.theirs}</span>
          </div>
        </>
      ) : null}

      <p className="muted" style={{ marginTop: 12, marginBottom: 4 }}>
        {live.length === 0
          ? 'Every category is decided. Nothing you do this week changes the result.'
          : `${live.length} ${live.length === 1 ? 'category is' : 'categories are'} still in play — those are the only ones a lineup change can move.`}
      </p>

      {live.length > 0 ? <p className="sect mu-sect">Still in play</p> : null}
      {[...live].sort((a, b) => b.leverage - a.leverage).map((s) => <CatRow key={s.key} state={s} />)}

      {decided.length > 0 ? <p className="sect mu-sect">Decided</p> : null}
      {decided.map((s) => <CatRow key={s.key} state={s} />)}

      {odds && matchup.data ? (
        <>
          <p className="sect">Chance of winning the week</p>
          <div className="winprob">
            <div className="winprob-head">
              <span className={`winprob-n ${odds.win >= odds.lose ? 'good' : 'bad'}`}>{pct(odds.win)}</span>
              <span className="winprob-proj">
                Projected {odds.expectedFor.toFixed(1)}–{odds.expectedAgainst.toFixed(1)} in categories
              </span>
            </div>
            <div className="winprob-bar" role="img"
              aria-label={`Win ${pct(odds.win)}, tie ${pct(odds.tie)}, lose ${pct(odds.lose)}`}>
              <span className="wp-win" style={{ width: `${odds.win * 100}%` }} />
              <span className="wp-tie" style={{ width: `${odds.tie * 100}%` }} />
              <span className="wp-lose" style={{ width: `${odds.lose * 100}%` }} />
            </div>
            <div className="winprob-legend">
              <span><i className="wp-win" />Win {pct(odds.win)}</span>
              <span><i className="wp-tie" />Tie {pct(odds.tie)}</span>
              <span><i className="wp-lose" />Lose {pct(odds.lose)}</span>
            </div>
            <p className="muted winprob-note">
              {matchup.data.daysRemaining <= 0
                ? 'The week is over — this is the final result.'
                : `Recalculated from the live totals every time you open this. With ${matchup.data.daysRemaining} ${matchup.data.daysRemaining === 1 ? 'day' : 'days'} left there's still room for it to move; it firms up as the week runs out.`}
            </p>
          </div>
        </>
      ) : null}

      <p className="muted" style={{ marginTop: 14 }}>
        "Still in play" means the gap is within reach of what your active roster
        can produce in the days left. It is an estimate from season rates, not a
        projection — and so is the win chance above.
      </p>
    </Screen>

    {showOpponent && matchup.data ? (
      <OpponentSheet
        name={matchup.data.opponentName}
        live={score}
        onClose={() => setShowOpponent(false)}
      />
    ) : null}
    </>
  );
}

/** Whole percentages, but never round a real chance to a flat 0% or 100%. */
function pct(p: number): string {
  const n = Math.round(p * 100);
  if (n === 0 && p > 0) return '<1%';
  if (n === 100 && p < 1) return '>99%';
  return `${n}%`;
}

/**
 * The gap is the information; the adjective is only a reading of it. Showing
 * the bar alone made five categories look identical when the margins were 1, 2,
 * 3, five thousandths and nineteen hundredths.
 */
function gapText(state: CategoryState): string {
  if (Math.abs(state.margin) < 1e-9) return 'Level';
  const size = formatStat(state.key, Math.abs(state.margin));
  return `${state.margin > 0 ? '+' : '−'}${size}`;
}

/**
 * Four buckets, weighted towards the top of the range: with days left, most
 * categories genuinely are close, and a vocabulary where everything is a coin
 * flip tells you nothing.
 */
function closeness(leverage: number): string {
  if (leverage > 0.88) return 'coin flip';
  if (leverage > 0.62) return 'close';
  if (leverage > 0.3) return 'within reach';
  return 'a stretch';
}

function CatRow({ state }: { state: CategoryState }) {
  const meta = metaFor(state.key);
  const ahead = state.margin > 1e-9;
  const behind = state.margin < -1e-9;

  const chipClass =
    state.status === 'won' ? 'in'
    : state.status === 'lost' ? 'out'
    : state.status === 'tied' ? 'unk'      // level is not losing
    : ahead ? 'in' : 'out';

  const label =
    state.status === 'won' ? 'Won'
    : state.status === 'lost' ? 'Lost'
    : state.status === 'tied' ? 'Level'
    : ahead ? 'Ahead' : 'Behind';

  return (
    <div className={`mrow ${state.status}`}>
      <span className={`ring mine${ahead ? ' lead' : ''}`}>{formatStat(state.key, state.mine)}</span>

      <div className="mrow-mid">
        <div className="mrow-cat">
          <span className="cat-key">{state.key}</span>
          <span className="cat-name">{meta.label}</span>
        </div>
        <div className="lev-track">
          <div className="lev-fill" style={{ width: `${Math.round(state.leverage * 100)}%` }} />
        </div>
        <div className="mrow-foot">
          <span className={`chip ${chipClass}`}>{label}</span>
          {state.leverage > 0 ? (
            <span className="muted">{gapText(state)} · {closeness(state.leverage)}</span>
          ) : (
            <span className="muted">{gapText(state)}</span>
          )}
        </div>
      </div>

      <span className={`ring theirs${behind ? ' lead' : ''}`}>{formatStat(state.key, state.theirs)}</span>
    </div>
  );
}
