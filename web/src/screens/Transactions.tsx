import { api } from '../api';
import { Screen } from '../components';
import type { Transaction } from '../types';
import { useAsync } from '../useAsync';

/**
 * Opponent activity first -- that is the whole point of this screen, and the
 * reason a transaction push exists at all. League-wide activity is a lesser
 * section underneath, for context, not the lede.
 */
export default function Transactions() {
  const roster = useAsync(() => api.getRoster());
  const txns = useAsync(() => api.getTransactions());

  const cap = roster.data?.league.weeklyAddLimit ?? null;
  const opponent = txns.data?.opponent ?? null;
  const remaining = cap !== null && opponent ? Math.max(0, cap - opponent.addsThisWeek) : null;
  const pct = cap && opponent ? Math.min(100, Math.round((opponent.addsThisWeek / cap) * 100)) : 0;

  return (
    <Screen
      title="Transactions"
      subtitle={opponent ? `This week vs ${opponent.teamName}` : undefined}
      sample={txns.data?.sample ?? roster.data?.sample}
      updatedAt={txns.data?.fetchedAt ?? null}
      loading={roster.loading || txns.loading}
      error={roster.error ?? txns.error}
      onReload={() => { roster.reload(); txns.reload(); }}
    >
      {opponent ? (
        <div className="stack">
          <p style={{ margin: 0 }}>
            <strong>{opponent.teamName}</strong> has made{' '}
            <strong>{opponent.addsThisWeek}</strong>
            {cap !== null ? <> of {cap} adds this week</> : <> {opponent.addsThisWeek === 1 ? 'add' : 'adds'} this week</>}
          </p>
          {cap !== null ? (
            <>
              <div className="track" style={{ marginTop: 10 }}>
                <div
                  className="fill"
                  style={{
                    width: `${pct}%`,
                    background: remaining === 0 ? 'var(--clay)' : 'var(--amber)',
                  }}
                />
              </div>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {remaining === 0
                  ? 'No adds left this week.'
                  : `${remaining} ${remaining === 1 ? 'add' : 'adds'} left before the weekly cap resets.`}
              </p>
            </>
          ) : null}
        </div>
      ) : (
        <div className="item plain">
          <p className="verdict" style={{ marginTop: 0 }}>
            No head-to-head opponent this week.
          </p>
        </div>
      )}

      {opponent && opponent.transactions.length > 0 ? (
        <>
          <p className="sect">{opponent.teamName}'s moves this week</p>
          {opponent.transactions.map((t) => <TxnRow key={t.id} txn={t} />)}
        </>
      ) : null}

      {txns.data && txns.data.league.length > 0 ? (
        <>
          <p className="sect">League activity</p>
          {txns.data.league.map((t) => <TxnRow key={t.id} txn={t} showTeam />)}
        </>
      ) : null}
    </Screen>
  );
}

function TxnRow({ txn, showTeam }: { txn: Transaction; showTeam?: boolean }) {
  return (
    <div className="item plain">
      <div className="item-top">
        {showTeam ? <span className="pname">{txn.teamName}</span> : null}
        <span className="pmeta">{when(txn.timestamp)}</span>
      </div>
      {txn.players.map((p) => (
        <p className="verdict" key={p.playerKey} style={{ marginTop: showTeam ? undefined : 0 }}>
          <span className={`chip ${p.move === 'add' ? 'in' : 'out'}`}>
            {p.move === 'add' ? 'Add' : 'Drop'}
          </span>{' '}
          {p.name}
        </p>
      ))}
    </div>
  );
}

function when(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}
