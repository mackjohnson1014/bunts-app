import { api } from '../api';
import { Screen } from '../components';
import { formatStat, metaFor } from '../scoring/categories';
import { categoryStates, type CategoryState } from '../scoring/leverage';
import { useAsync } from '../useAsync';

/**
 * The week, category by category. In head-to-head this is the scoreboard every
 * other decision hangs off: a lineup change only matters if it moves a category
 * that is still live.
 */
export default function MatchupScreen() {
  const roster = useAsync(() => api.getRoster());
  const matchup = useAsync(() => api.getMatchup());

  const states =
    matchup.data && roster.data ? categoryStates(matchup.data, roster.data.players) : [];

  const won = states.filter((s) => s.status === 'won').length;
  const lost = states.filter((s) => s.status === 'lost').length;
  const live = states.filter((s) => s.status === 'live' || s.status === 'tied');

  return (
    <Screen
      title="This week"
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
      <div className="slate">
        <div><span className="n" style={{ color: 'var(--grass)' }}>{won}</span><span className="k">Won</span></div>
        <div><span className="n" style={{ color: 'var(--amber)' }}>{live.length}</span><span className="k">Live</span></div>
        <div><span className="n" style={{ color: 'var(--clay)' }}>{lost}</span><span className="k">Lost</span></div>
        <div><span className="n">{states.length}</span><span className="k">Cats</span></div>
      </div>

      <p className="muted" style={{ marginBottom: 4 }}>
        {live.length === 0
          ? 'Every category is decided. Nothing you do this week changes the result.'
          : `${live.length} ${live.length === 1 ? 'category is' : 'categories are'} still in play — those are the only ones a lineup change can move.`}
      </p>

      {live.length > 0 ? <p className="sect">Still in play</p> : null}
      {live.sort((a, b) => b.leverage - a.leverage).map((s) => <CatRow key={s.key} state={s} />)}

      {won + lost > 0 ? <p className="sect">Decided</p> : null}
      {states.filter((s) => s.status === 'won' || s.status === 'lost').map((s) => (
        <CatRow key={s.key} state={s} />
      ))}

      <p className="muted" style={{ marginTop: 14 }}>
        "Still in play" means the gap is within reach of what your active roster
        can produce in the days left. It is an estimate from season rates, not a
        projection.
      </p>
    </Screen>
  );
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
  const ahead = state.margin > 0;

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
    <div className={`catrow ${state.status}`}>
      <div className="catrow-top">
        <span className="cat-key">{state.key}</span>
        <span className="cat-name">{meta.label}</span>
        <span className={`chip ${chipClass}`}>{label}</span>
      </div>

      <div className="cat-values">
        <span className={ahead ? 'mine ahead' : 'mine'}>{formatStat(state.key, state.mine)}</span>
        <span className="cat-sep">vs</span>
        <span className="theirs">{formatStat(state.key, state.theirs)}</span>
      </div>

      {state.leverage > 0 ? (
        <div className="lev">
          <div className="lev-track">
            <div className="lev-fill" style={{ width: `${Math.round(state.leverage * 100)}%` }} />
          </div>
          <span className="muted">
            {gapText(state)} · {closeness(state.leverage)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
