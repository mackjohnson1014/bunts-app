import { useState } from 'react';
import { api } from '../api';
import { Screen } from '../components';
import { PlayerSheet } from '../PlayerSheet';
import type { AcquisitionHow, KeeperCandidate, Player, Roster } from '../types';
import { useAsync } from '../useAsync';

type Tab = 'keepers' | 'draft' | 'build';

const TABS: { id: Tab; label: string }[] = [
  { id: 'keepers', label: 'Keepers' },
  { id: 'draft', label: 'Draft' },
  { id: 'build', label: 'Roster build' },
];

export default function Keepers() {
  const roster = useAsync(() => api.getRoster());
  const keepers = useAsync(() => api.getKeepers());
  const [tab, setTab] = useState<Tab>('keepers');
  const [selected, setSelected] = useState<Player | null>(null);

  const slots = roster.data?.league.keeperSlots ?? 0;

  return (
    <>
      <Screen
        title="Keepers"
        subtitle={slots ? `Running tally · ${slots} slots next season` : 'Running tally'}
        sample={roster.data?.sample}
        loading={roster.loading || keepers.loading}
        error={roster.error ?? keepers.error}
        onReload={() => { roster.reload(); keepers.reload(); }}
      >
        <div className="segmented keepers-tabs" role="radiogroup" aria-label="Keepers section">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={tab === t.id}
              aria-selected={tab === t.id}
              className="seg"
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {roster.data ? (
          tab === 'keepers' ? (
            <KeeperList roster={roster.data} keepers={keepers.data ?? []} />
          ) : tab === 'draft' ? (
            <DraftTab roster={roster.data} onOpen={setSelected} />
          ) : (
            <BuildTab roster={roster.data} onOpen={setSelected} />
          )
        ) : null}
      </Screen>

      <PlayerSheet player={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/* ---------- Keepers: the running tally ---------- */

function KeeperList({ roster, keepers }: { roster: Roster; keepers: KeeperCandidate[] }) {
  const byKey = new Map(roster.players.map((p) => [p.playerKey, p]));
  const slots = roster.league.keeperSlots;
  const top = keepers[0]?.score ?? 1;

  return (
    <>
      {keepers.map((k) => {
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
                    {player?.slot === 'IL' ? ' · on IL' : ''}
                  </div>
                </span>
                <span className="keep-score">{Math.round(k.score)}</span>
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
        Ranked on season production across your ten categories, per game, with a
        bump for scarce positions. Scores are relative to <em>this roster</em> —
        they rank your own players against each other and say nothing about
        whether someone is worth keeping over a waiver pickup.
      </p>
    </>
  );
}

/* ---------- Draft: our picks this season ---------- */

function DraftTab({ roster, onOpen }: { roster: Roster; onOpen: (p: Player) => void }) {
  const picks = roster.draft;
  if (!picks) {
    return <p className="muted">Your draft picks show up once Yahoo is connected.</p>;
  }
  const byKey = new Map(roster.players.map((p) => [p.playerKey, p]));
  const kept = picks.filter((p) => p.keeper).length;
  const stillHere = picks.filter((p) => !p.keeper && p.onRoster).length;
  const drafted = picks.length - kept;

  return (
    <>
      <p className="keep-note" style={{ marginBottom: 6 }}>
        {picks.length} picks · {kept} spent on keepers · {stillHere} of {drafted} new draftees still on the roster
      </p>
      {picks.map((d) => {
        const player = byKey.get(d.playerKey);
        return (
          <div
            key={d.pick}
            className={`draft-row${d.onRoster ? '' : ' gone'}`}
            onClick={player ? () => onOpen(player) : undefined}
            role={player ? 'button' : undefined}
          >
            <span className="d-pick">Rd {d.round} · #{d.pick}</span>
            <span>
              <span className="pname">{d.playerName}</span>
              {d.keeper ? <span className="chip in" style={{ marginLeft: 6 }}>Keeper</span> : null}
              <div className="sub">{d.mlbTeam} · {d.positions.join('/')}</div>
            </span>
            <span className={`chip ${d.onRoster ? 'in' : 'out'}`}>{d.onRoster ? 'On roster' : 'Dropped'}</span>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Roster build: depth by position, and how everyone got here ---------- */

const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'];

/** Used only when the league doesn't say. */
const DEFAULT_SLOTS: Record<string, number> = { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, SP: 2, RP: 2 };

type Verdict = 'short' | 'thin' | 'ok' | 'heavy';
const VERDICT_LABEL: Record<Verdict, string> = { short: 'Short', thin: 'Thin', ok: 'OK', heavy: 'Surplus' };

/**
 * Spare = healthy eligible players beyond the starting slots for that position.
 * Below zero you can't fill the slot; zero means one injury leaves a hole;
 * spare of at least the slot count plus two (and at least three) is more than
 * the position can use -- trade material.
 */
function verdict(healthy: number, need: number): Verdict {
  const spare = healthy - need;
  if (spare < 0) return 'short';
  if (spare === 0) return 'thin';
  if (spare >= Math.max(3, need + 2)) return 'heavy';
  return 'ok';
}

const isInjured = (p: Player) => p.slot === 'IL' || (p.status?.startsWith('IL') ?? false);

const HOW_LABEL: Record<AcquisitionHow, string> = {
  keeper: 'Keeper', draft: 'Draft', waiver: 'Waivers', 'free-agent': 'Free agent', trade: 'Trade',
};
const HOW_ORDER: AcquisitionHow[] = ['keeper', 'draft', 'waiver', 'free-agent', 'trade'];

function BuildTab({ roster, onOpen }: { roster: Roster; onOpen: (p: Player) => void }) {
  const slots = roster.league.rosterSlots ?? DEFAULT_SLOTS;

  const rows = POSITIONS.map((pos) => {
    const eligible = roster.players.filter((p) => p.positions.includes(pos));
    const healthy = eligible.filter((p) => !isInjured(p)).length;
    const need = slots[pos] ?? 0;
    return { pos, need, healthy, injured: eligible.length - healthy, v: verdict(healthy, need) };
  });

  const flags = rows.filter((r) => r.v === 'short' || r.v === 'thin').map((r) => r.pos);
  const surplus = rows.filter((r) => r.v === 'heavy').map((r) => r.pos);

  const known = roster.players.filter((p) => p.acquired);
  const counts = HOW_ORDER
    .map((h) => ({ h, n: known.filter((p) => p.acquired!.how === h).length }))
    .filter((c) => c.n > 0);
  const byDate = [...known].sort((a, b) =>
    a.acquired!.date.localeCompare(b.acquired!.date) || a.name.localeCompare(b.name));
  const unknown = roster.players.length - known.length;

  return (
    <>
      <p className="sect" style={{ marginTop: 0 }}>Depth by position</p>
      <p className="keep-note" style={{ marginBottom: 6 }}>
        {flags.length ? `Thin at ${flags.join(', ')}.` : 'No thin spots.'}
        {surplus.length ? ` Surplus at ${surplus.join(', ')}.` : ''}
      </p>
      <table className="compare">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Starts</th>
            <th>Healthy</th>
            <th>IL</th>
            <th>Depth</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pos}>
              <td className="cat">{r.pos}</td>
              <td className="expected">{r.need}</td>
              <td>{r.healthy}</td>
              <td className="expected">{r.injured || '–'}</td>
              <td><span className={`depth-verdict ${r.v}`}>{VERDICT_LABEL[r.v]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="keep-note" style={{ marginTop: 6 }}>
        Counts every player eligible at a position, so multi-position players count
        more than once. Thin means no healthy backup; surplus means more than the
        position can use. UTIL and P flex slots aren&rsquo;t counted against any one position.
      </p>

      <p className="sect">How we built it</p>
      {known.length === 0 ? (
        <p className="muted">How each player joined shows up once Yahoo is connected.</p>
      ) : (
        <>
          <div className="tally">
            {counts.map((c) => (
              <span key={c.h} className="chip">{HOW_LABEL[c.h]} · {c.n}</span>
            ))}
            {unknown ? <span className="chip unk">Unknown · {unknown}</span> : null}
          </div>
          {byDate.map((p) => (
            <div key={p.playerKey} className="acq-row" role="button" onClick={() => onOpen(p)}>
              <span className="a-date">{shortDate(p.acquired!.date)}</span>
              <span>
                <span className="pname">{p.name}</span>
                <div className="sub">{p.mlbTeam} · {p.positions.join('/')}</div>
              </span>
              <span className="chip">{HOW_LABEL[p.acquired!.how]}</span>
            </div>
          ))}
        </>
      )}
    </>
  );
}

const shortDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
