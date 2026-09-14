import { api } from '../api';
import { Screen } from '../components';
import { useAsync } from '../useAsync';

export default function Keepers() {
  const roster = useAsync(() => api.getRoster());
  const keepers = useAsync(() => api.getKeepers());

  const byKey = new Map((roster.data?.players ?? []).map((p) => [p.playerKey, p]));
  const slots = roster.data?.league.keeperSlots ?? 0;
  const top = keepers.data?.[0]?.score ?? 1;

  return (
    <Screen
      title="Keepers"
      subtitle={slots ? `Running tally · ${slots} slots next season` : 'Running tally'}
      sample={roster.data?.sample}
      loading={roster.loading || keepers.loading}
      error={roster.error ?? keepers.error}
      onReload={() => { roster.reload(); keepers.reload(); }}
    >
      {(keepers.data ?? []).map((k) => {
        const player = byKey.get(k.playerKey);
        const inside = k.rank <= slots;
        return (
          <div key={k.playerKey}>
            {k.rank === slots + 1 ? <div className="cutline">Cut line</div> : null}
            <div className={`keep${inside ? ' in' : ''}`}>
              <div className="keep-top">
                <span className="keep-rank">{k.rank}</span>
                <span>
                  <span className="pname">{player?.name ?? k.playerKey}</span>
                  <div className="sub">
                    {player ? `${player.mlbTeam} · ${player.positions.join('/')}` : ''}
                    {player?.percentOwned != null ? ` · ${player.percentOwned}% rostered` : ''}
                  </div>
                </span>
                <span className="keep-score">{k.score.toFixed(1)}</span>
              </div>
              <div className="track">
                <div className="fill" style={{ width: `${Math.max(4, Math.round((k.score / top) * 100))}%` }} />
              </div>
              <p className="keep-note">{k.note}</p>
            </div>
          </div>
        );
      })}

      <p className="keep-note" style={{ marginTop: 14 }}>
        Scores accumulate all season. A hot September moves the cut line, so this
        is a tally, not a verdict.
      </p>
    </Screen>
  );
}
