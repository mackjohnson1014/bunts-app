import { useEffect, useState } from 'react';
import { api } from '../api';
import { FormStrip, LineupState, Screen } from '../components';
import { PlayerSheet } from '../PlayerSheet';
import type { LineupCall, Player } from '../types';
import { STARTING_SLOTS } from '../types';
import { useAsync } from '../useAsync';

export default function Today() {
  const roster = useAsync(() => api.getRoster());
  const calls = useAsync(() => api.getLineupCalls());
  const [selected, setSelected] = useState<Player | null>(null);

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
    <>
      <Screen
        title="Today"
        subtitle={<Countdown lockAt={roster.data?.lockAt ?? null} />}
        sample={roster.data?.sample}
        updatedAt={roster.data?.fetchedAt ?? null}
        loading={roster.loading || calls.loading}
        error={roster.error ?? calls.error}
        onReload={() => { roster.reload(); calls.reload(); }}
      >
        <div className="slate">
          <Cell n={counts.active} k="Active" />
          <Cell n={counts.in} k="In" color="var(--grass)" />
          <Cell n={counts.out} k="Out" color="var(--clay)" />
          <Cell n={counts.unposted} k="Unposted" color="var(--amber)" />
        </div>

        {actionable.length === 0 && holds.length === 0 ? (
          <div className={`item ${counts.out > 0 ? 'critical' : 'plain'}`}>
            <p className="verdict" style={{ marginTop: 0 }}>
              {counts.out > 0
                ? `No suggestions yet, but ${counts.out} active ${counts.out === 1 ? 'player is' : 'players are'} out of tonight's lineups.`
                : counts.unposted > 0
                  ? `Nothing to change yet — ${counts.unposted} ${counts.unposted === 1 ? 'lineup has' : 'lineups have'} not been posted.`
                  : 'Nothing to change today.'}
            </p>
          </div>
        ) : null}

        {actionable.length > 0 ? <p className="sect">Needs a decision</p> : null}
        {actionable.map((c) => (
          <Call key={c.playerKey} call={c} player={byKey.get(c.playerKey)} onOpen={setSelected} />
        ))}

        {holds.length > 0 ? <p className="sect">Check back before lock</p> : null}
        {holds.map((c) => (
          <Call key={c.playerKey} call={c} player={byKey.get(c.playerKey)} onOpen={setSelected} />
        ))}
      </Screen>

      <PlayerSheet player={selected} onClose={() => setSelected(null)} />
    </>
  );
}

const Cell = ({ n, k, color }: { n: number; k: string; color?: string }) => (
  <div>
    <span className="n" style={color ? { color } : undefined}>{n}</span>
    <span className="k">{k}</span>
  </div>
);

/** Time pressure is the whole point of this screen, so it ticks. */
function Countdown({ lockAt }: { lockAt: string | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!lockAt) return <>No games today</>;

  const ms = new Date(lockAt).getTime() - Date.now();
  if (ms <= 0) return <>Lineups are locked</>;

  const mins = Math.round(ms / 60000);
  const when = new Date(lockAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const left = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <>
      Lineups lock at {when} · <strong className={mins <= 30 ? 'urgent' : undefined}>{left}</strong>
    </>
  );
}

function Call({
  call, player, onOpen,
}: {
  call: LineupCall;
  player: Player | undefined;
  onOpen: (p: Player) => void;
}) {
  const tone = call.recommendation === 'sit' ? 'critical' : call.recommendation === 'start' ? 'ok' : 'pending';
  const chip =
    call.recommendation === 'sit' ? { cls: 'out', text: 'Sit' }
    : call.recommendation === 'start' ? { cls: 'in', text: 'Start' }
    : { cls: 'unk', text: 'Wait' };

  const inner = (
    <>
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

      {player && !player.startingToday && player.opposingPitcher ? (
        <p className="verdict" style={{ color: 'var(--chalk-dim)', fontSize: 12.5 }}>
          Facing {player.opposingPitcher}
        </p>
      ) : null}

      <div className="fix">
        <LineupState starting={player?.startingToday ?? null} />
        {player ? <FormStrip games={player.recentGames} /> : null}
        <span className="muted">
          {Math.round(call.confidence * 100)}%{call.confidence < 0.6 ? ' — near coin flip' : ''}
        </span>
        {player ? <span className="chevron" aria-hidden="true">›</span> : null}
      </div>
    </>
  );

  if (!player) return <div className={`item ${tone}`}>{inner}</div>;

  return (
    <button className={`item ${tone} item-button`} onClick={() => onOpen(player)}>
      {inner}
    </button>
  );
}
