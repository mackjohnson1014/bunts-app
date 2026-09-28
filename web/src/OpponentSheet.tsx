import { useEffect, useState } from 'react';
import { api } from './api';
import { PlayerSheet } from './PlayerSheet';
import { RosterList } from './RosterList';
import { ordinal } from './screens/Roster';
import { meetingResult, recordText, series, type Series, type WeekScore } from './scoring/h2h';
import type { Meeting, Player } from './types';
import { useAsync } from './useAsync';

/**
 * This week's opponent, opened from his name on Matchup: his overall record,
 * our season series with him (and who holds the playoff tiebreaker), and his
 * roster in the same layout as ours.
 *
 * The live meeting's score comes from the Matchup screen rather than from
 * the opponent payload, so the sheet can never show a different score from
 * the scoreboard it was opened from.
 */
export function OpponentSheet({
  name, live, onClose,
}: {
  /** Shown while the opponent loads. */
  name: string;
  /** This week's score as it stands, from the Matchup screen. */
  live: WeekScore;
  onClose: () => void;
}) {
  const { data, error, loading } = useAsync(() => api.getOpponent());
  const [selected, setSelected] = useState<Player | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A player sheet on top gets Escape first; don't close both at once.
      if (e.key === 'Escape' && !selected) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, selected]);

  const meetings: Meeting[] = (data?.meetings ?? []).map((m) =>
    m.status === 'live' ? { ...m, mine: live.mine, theirs: live.theirs, ties: live.ties } : m,
  );
  const hasLive = meetings.some((m) => m.status === 'live');
  const banked = series(meetings.filter((m) => m.status === 'final'));
  const asItStands = series(meetings.filter((m) => m.status !== 'upcoming'));

  const rec = data?.record;
  const games = rec ? rec.wins + rec.losses + rec.ties : 0;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} role="presentation">
        <div
          className="sheet sheet-tall"
          role="dialog"
          aria-modal="true"
          aria-label={data?.team.name ?? name}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sheet-grab" aria-hidden="true" />

          <div className="sheet-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="sheet-name">{data?.team.name ?? name}</h2>
              <p className="sheet-meta">
                This week’s opponent
                {data?.team.rank ? ` · ${ordinal(data.team.rank)} place` : ''}
                {data?.sample ? ' · sample data' : ''}
              </p>
            </div>
            <button className="sheet-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          <div className="sheet-body">
            {loading && !data ? <p className="muted" style={{ marginTop: 14 }}>Loading…</p> : null}
            {error && !data ? (
              <p className="muted" style={{ marginTop: 14 }}>
                Couldn’t load his team: {error instanceof Error ? error.message : String(error)}
              </p>
            ) : null}

            {data && rec ? (
              <>
                <p className="sect">Overall record</p>
                <div className="tonight">
                  <div>
                    <span className="k">Record</span>
                    <span className="v">{recordText(rec.wins, rec.losses, rec.ties)}</span>
                  </div>
                  <div>
                    <span className="k">Place</span>
                    <span className="v">{data.team.rank ? ordinal(data.team.rank) : '—'}</span>
                  </div>
                  <div>
                    <span className="k">Win %</span>
                    <span className="v">
                      {games > 0 ? ((rec.wins + rec.ties / 2) / games).toFixed(3).replace(/^0/, '') : '—'}
                    </span>
                  </div>
                </div>

                <p className="sect">Head to head this season</p>
                <ul className="h2h-list">
                  {meetings.map((m) => <MeetingRow key={m.week} meeting={m} />)}
                </ul>

                <div className="h2h-summary">
                  <div className="h2h-stats">
                    <div>
                      <span className="k">Series</span>
                      <span className="v">{recordText(banked.wins, banked.losses, banked.ties)}</span>
                    </div>
                    <div>
                      <span className="k">Points</span>
                      <span className="v">{banked.pointsFor}–{banked.pointsAgainst}</span>
                    </div>
                    <div>
                      <span className="k">Tiebreaker</span>
                      <span className={`v ${holderClass(banked)}`}>{holderWord(banked)}</span>
                    </div>
                  </div>
                  <p className="h2h-line">{tiebreakerText(banked, false)}</p>
                  {hasLive ? (
                    <p className="h2h-line live">
                      <span className="chip unk">If it ends now</span> {tiebreakerText(asItStands, true)}
                    </p>
                  ) : null}
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  Playoff ties are broken by head-to-head record first, then by
                  combined category score across both meetings.
                </p>

                <p className="sect">His roster</p>
                <RosterList players={data.players} onOpen={setSelected} />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* A sibling, not a child: clicks on its backdrop must not bubble up
          and close the opponent sheet underneath. */}
      <PlayerSheet player={selected} onClose={() => setSelected(null)} readOnly />
    </>
  );
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const r = meetingResult(meeting);
  const label =
    meeting.status === 'upcoming' ? 'Upcoming'
    : meeting.status === 'live' ? 'This week'
    : 'Final';
  const score = r === null
    ? '—'
    : `${meeting.mine}–${meeting.theirs}${meeting.ties ? `–${meeting.ties}` : ''}`;
  const tone = r === 'W' ? 'in' : r === 'L' ? 'out' : 'unk';

  return (
    <li className={`h2h-row ${meeting.status}`}>
      <span className="h2h-week">Week {meeting.week}</span>
      <span className="h2h-status">{label}</span>
      <span className="h2h-score">{score}</span>
      {r ? (
        <span className={`chip ${tone}`}>
          {meeting.status === 'live' ? (r === 'W' ? 'Leading' : r === 'L' ? 'Trailing' : 'Level') : r}
        </span>
      ) : <span />}
    </li>
  );
}

const holderWord = (s: Series) =>
  s.counted === 0 ? '—' : s.holder === 'us' ? 'Yours' : s.holder === 'them' ? 'His' : 'Level';

const holderClass = (s: Series) =>
  s.holder === 'us' ? 'good' : s.holder === 'them' ? 'bad' : 'warn';

function tiebreakerText(s: Series, projected: boolean): string {
  if (s.counted === 0) return 'No meetings finished yet — nobody holds the tiebreaker.';

  const rec = recordText(s.wins, s.losses, s.ties);
  const pts = `${s.pointsFor}–${s.pointsAgainst}`;
  const who = s.holder === 'us' ? 'you' : 'he';

  if (projected) {
    const lead = `Series ${rec}, points ${pts}: `;
    if (s.decidedBy === 'record') return `${lead}${who}’d hold the tiebreaker on record.`;
    if (s.decidedBy === 'points') return `${lead}level on record, so ${who}’d hold it on points.`;
    return `${lead}level on both — nobody would hold it.`;
  }

  const Who = s.holder === 'us' ? 'You hold' : 'He holds';
  if (s.decidedBy === 'record') return `${Who} the tiebreaker on head-to-head record (${rec}).`;
  if (s.decidedBy === 'points') {
    return `Series level at ${rec}, so it goes to points — ${who === 'you' ? 'you hold' : 'he holds'} it, ${pts}.`;
  }
  return 'Level on both record and points — nobody holds it yet.';
}
