import { api } from '../api';
import { LineupState, Screen } from '../components';
import type { LineupCall, Player } from '../types';
import { STARTING_SLOTS } from '../types';
import { useAsync } from '../useAsync';

export default function Today() {
  const roster = useAsync(() => api.getRoster());
  const calls = useAsync(() => api.getLineupCalls());

  const players = roster.data?.players ?? [];
  const byKey = new Map(players.map((p) => [p.playerKey, p]));
  const active = players.filter((p) => STARTING_SLOTS.includes(p.slot));

  const counts = {
    active: active.length,
    in: active.filter((p) => p.startingToday === true).length,
    out: active.filter((p) => p.startingToday === false).length,
    unposted: active.filter((p) => p.startingToday === null).length,
  };

  const list = calls.data ?? [];
  const actionable = list.filter((c) => c.recommendation !== 'hold');
  const holds = list.filter((c) => c.recommendation === 'hold');

  return (
    <Screen
      title="Today"
      subtitle={roster.data ? `${roster.data.team.name} · ${roster.data.league.name}` : undefined}
      loading={roster.loading || calls.loading}
      error={roster.error ?? calls.error}
      onReload={() => { roster.reload(); calls.reload(); }}
    >
      <div className="slate">
        <div><span className="n">{counts.active}</span><span className="k">Active</span></div>
        <div><span className="n" style={{ color: 'var(--grass)' }}>{counts.in}</span><span className="k">In</span></div>
        <div><span className="n" style={{ color: 'var(--clay)' }}>{counts.out}</span><span className="k">Out</span></div>
        <div><span className="n" style={{ color: 'var(--amber)' }}>{counts.unposted}</span><span className="k">Unposted</span></div>
      </div>

      {actionable.length === 0 && holds.length === 0 ? (
        <div className="item plain">
          <p className="verdict" style={{ marginTop: 0 }}>Nothing to change today.</p>
        </div>
      ) : null}

      {actionable.length > 0 ? <p className="sect">Needs a decision</p> : null}
      {actionable.map((c) => <Call key={c.playerKey} call={c} player={byKey.get(c.playerKey)} />)}

      {holds.length > 0 ? <p className="sect">Check back before lock</p> : null}
      {holds.map((c) => <Call key={c.playerKey} call={c} player={byKey.get(c.playerKey)} />)}
    </Screen>
  );
}

function Call({ call, player }: { call: LineupCall; player: Player | undefined }) {
  const tone =
    call.recommendation === 'sit' ? 'critical'
    : call.recommendation === 'start' ? 'ok'
    : 'pending';

  const chip =
    call.recommendation === 'sit' ? { cls: 'out', text: 'Sit' }
    : call.recommendation === 'start' ? { cls: 'in', text: 'Start' }
    : { cls: 'unk', text: 'Wait' };

  return (
    <div className={`item ${tone}`}>
      <div className="item-top">
        <span className="pname">{player?.name ?? call.playerKey}</span>
        <span className={`chip ${chip.cls}`}>{chip.text}</span>
        {player ? (
          <span className="pmeta">
            {player.positions[0]}{player.opponent ? ` · ${player.opponent}` : ''}
          </span>
        ) : null}
      </div>

      <p className="verdict">{call.reason}</p>

      <div className="fix">
        <LineupState starting={player?.startingToday ?? null} />
        <span className="muted">
          {Math.round(call.confidence * 100)}% confidence
          {call.confidence < 0.6 ? ' — close to a coin flip' : ''}
        </span>
      </div>
    </div>
  );
}
