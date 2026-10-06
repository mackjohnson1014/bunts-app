// Normalized domain model for Bunts.
//
// IMPORTANT: these types are deliberately NOT Yahoo's response shapes. Yahoo's
// fantasy JSON is deeply nested and irregular, and we have not seen it yet.
// The backend owns the Yahoo -> Bunts translation; the app only ever sees the
// shapes below. When real API access lands, the adapter changes and this does not.

export type Slot =
  | 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF' | 'UTIL'
  | 'SP' | 'RP' | 'P'
  | 'BN' | 'IL' | 'NA';

export const STARTING_SLOTS: Slot[] = ['C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL', 'SP', 'RP', 'P'];

/** Yahoo injury/availability status, or null when active. */
export type PlayerStatus = 'DTD' | 'IL10' | 'IL15' | 'IL60' | 'NA' | 'SUSP' | null;

/** One game already played, newest first in `recentGames`. */
export interface GameLine {
  date: string;          // ISO date
  opponent: string;      // "@ SD"
  /** Human-readable line: "2-4, HR, 2 RBI" or "6.0 IP, 1 ER, 8 K". */
  summary: string;
  /** Did this game help or hurt, roughly. Drives the form strip. */
  quality: 'good' | 'neutral' | 'bad' | 'dnp';
}

/** A hitter's career numbers against one specific pitcher -- not season-scoped. */
export interface VsPitcherStats {
  pitcherName: string;
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  avg: number;
  obp: number;
  slg: number;
  strikeOuts: number;
  walks: number;
}

/** How a player came to be on our team. */
export type AcquisitionHow = 'draft' | 'keeper' | 'waiver' | 'free-agent' | 'trade';

export interface Acquisition {
  how: AcquisitionHow;
  /** ISO date he joined our roster. */
  date: string;
  /** Optional specifics, e.g. "Round 4, pick 37" or "from Pierre's Team". */
  detail?: string;
}

/** One change of hands in a player's season, from Yahoo's draft and transaction log. */
export type MoveKind = 'drafted' | 'kept' | 'added' | 'claimed' | 'dropped' | 'traded';

export interface PlayerMove {
  /** ISO date. */
  date: string;
  kind: MoveKind;
  /** Fantasy team he left; null when he came from free agents/waivers or the draft. */
  fromTeam: string | null;
  /** Fantasy team he joined; null when he was dropped to waivers. */
  toTeam: string | null;
  detail?: string;
  /** True when our team is either side of the move. */
  ours: boolean;
}

/** One of our picks in this season's draft. */
export interface DraftPick {
  round: number;
  /** Overall pick number. */
  pick: number;
  playerKey: string;
  playerName: string;
  mlbTeam: string;
  positions: string[];
  /** Pick spent on keeping one of last season's players. */
  keeper: boolean;
  /** Still on our roster today. */
  onRoster: boolean;
}

export interface Player {
  playerKey: string;
  name: string;
  mlbTeam: string;
  /** Positions the player is eligible at in this league. */
  positions: string[];
  /** Slot the player currently occupies on the roster. */
  slot: Slot;
  status: PlayerStatus;
  /**
   * Whether the player is in today's starting lineup.
   * null means unknown -- either the lineup has not been posted yet, or we
   * could not determine it. Never render null as "not starting".
   */
  startingToday: boolean | null;
  /** Opponent, e.g. "@ TOR" or "vs BOS". */
  opponent: string | null;
  /** Opposing probable starter, when known. */
  opposingPitcher: string | null;
  seasonStats: Record<string, number>;
  last14Stats: Record<string, number>;
  /**
   * This week's (Monday through today) stat totals so far, for comparing
   * against the player's own season pace on the roster. Optional -- older
   * data sources (e.g. the offline mock roster) may not set this.
   */
  weekStats?: Record<string, number>;
  percentOwned: number | null;
  /** Newest first. Empty for a player who has not appeared recently. */
  recentGames: GameLine[];
  /** Injury or role note in plain language, when there is one. */
  note: string | null;
  /** MLB headshot, when available. Optional -- older data sources may not set it. */
  headshotUrl?: string | null;
  /**
   * Hitter's career line against tonight's opposing starter. Null (or the
   * key absent entirely) when there's no game today, the opposing starter
   * isn't known yet, this player is a pitcher, or he's simply never faced
   * that pitcher before -- all of which are ordinary, not errors.
   */
  vsPitcher?: VsPitcherStats | null;
  /**
   * When and how he joined our roster. Null/absent when we don't know yet --
   * Yahoo's draft results and transaction log are the real source.
   */
  acquired?: Acquisition | null;
  /**
   * His totals from `acquired.date` through today -- the part of his season
   * that actually counted for us. Absent for drafted/kept players, whose
   * whole season is ours (use seasonStats), and when `acquired` is unknown.
   */
  withUsStats?: Record<string, number>;
  /** His season's moves between teams, newest first. Absent when unknown. */
  history?: PlayerMove[];
}

export interface League {
  leagueKey: string;
  name: string;
  /** Scoring categories in league order, e.g. ['R','HR','RBI','SB','AVG',...]. */
  scoringCategories: string[];
  /** How many players can be kept into next season. */
  keeperSlots: number;
  /** League's weekly free-agent/waiver add cap, or null if the league has none. */
  weeklyAddLimit: number | null;
  currentWeek: number | null;
  /** Slots per position, e.g. { C: 1, OF: 3, UTIL: 2, SP: 3, P: 3, IL: 3 }. Bench is unlimited. */
  rosterSlots?: Record<string, number>;
  /** Most players allowed on the roster outside IL spots. */
  maxActive?: number;
}

export interface Team {
  teamKey: string;
  name: string;
  leagueKey: string;
  logoUrl: string | null;
  rank: number | null;
}

export interface Roster {
  team: Team;
  league: League;
  players: Player[];
  /** When this snapshot was taken, ISO 8601. */
  fetchedAt: string;
  /** When today's lineups lock, ISO 8601. Null outside a game day. */
  lockAt: string | null;
  /** True when this is the stand-in dataset rather than the real league. */
  sample?: boolean;
  /** Our picks in this season's draft, in order. Absent when unknown. */
  draft?: DraftPick[];
}

export type Recommendation = 'start' | 'sit' | 'hold';

export interface LineupCall {
  playerKey: string;
  recommendation: Recommendation;
  /** Plain-language justification shown to the user. */
  reason: string;
  /** 0..1. Anything below ~0.6 should read as a coin flip in the UI. */
  confidence: number;
}

export interface KeeperCandidate {
  playerKey: string;
  /** Running season score; higher is a stronger keep. Unitless, comparable within a season. */
  score: number;
  rank: number;
  /** What is driving the score, in one line. */
  note: string;
}

export const ALERT_KINDS = ['scratched', 'unposted', 'suggestions', 'transactions'] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface Prefs {
  scratched: boolean;
  unposted: boolean;
  suggestions: boolean;
  transactions: boolean;
  quietFrom: number | null;
  quietTo: number | null;
}

export interface Profile {
  email: string;
  firstName: string;
  lastName: string;
  prefs: Prefs;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  email: string;
  name: string;
  profile: Profile | null;
  needsOnboarding: boolean;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  prefs?: Partial<Prefs>;
}

/**
 * Co-owner suggestions. Mirrors functions/_shared/suggestions.ts -- see there
 * for the reasoning. Yahoo is read-only, so a suggestion is a proposal the
 * other owner reacts to, and someone marks done after making it in Yahoo.
 */
export interface PlayerRef {
  key: string;
  name: string;
  team?: string;
  pos?: string;
}

export type CallKind = 'start' | 'sit' | 'watch';

export type SuggestionBody =
  | { kind: 'call'; player: PlayerRef; call: CallKind }
  | { kind: 'swap'; start: PlayerRef; bench: PlayerRef }
  | { kind: 'pickup'; add: PlayerRef; drop: PlayerRef | null };

export type SuggestionKind = SuggestionBody['kind'];

export type SuggestionInput = SuggestionBody & {
  note: string;
  /** YYYY-MM-DD the lineup call is for; null for watch and pickups. */
  date: string | null;
};

export interface SuggestionPerson { email: string; name: string }
export interface SuggestionReaction extends SuggestionPerson { value: 'agree' | 'disagree'; at: string }
export interface SuggestionReply extends SuggestionPerson {
  id: string;
  text: string;
  at: string;
  /** A counter-proposal: the terms it replaced and the ones it put forward. */
  counter?: { from: SuggestionBody; to: SuggestionBody };
}

export type SuggestionStatus = 'open' | 'done' | 'passed';
export type SuggestionState = SuggestionStatus | 'expired';

export interface Suggestion {
  id: string;
  body: SuggestionBody;
  note: string;
  date: string | null;
  expiresAt: string | null;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  status: SuggestionStatus;
  /** Who put forward the current terms -- the author until someone counters. */
  termsBy?: SuggestionPerson;
  resolvedBy: (SuggestionPerson & { at: string }) | null;
  reactions: SuggestionReaction[];
  replies: SuggestionReply[];
  seenBy: string[];
  /** Added per-request by the API, relative to whoever is asking. */
  state: SuggestionState;
  mine: boolean;
  /** You proposed the current terms, so reacting is the other person's move. */
  myTerms: boolean;
  unread: boolean;
}

/** A name-search result for proposing a pickup (MLB data; Yahoo availability unknown). */
export interface PlayerSearchHit extends PlayerRef {
  headshotUrl?: string;
}

/** One category in this week's head-to-head matchup. */
export interface MatchupCategory {
  key: string;
  mine: number;
  theirs: number;
}

/**
 * Supporting totals for one team's week -- not scoring categories, but the
 * numbers behind them and the league limits that constrain them.
 */
export interface TeamWeekTotals {
  /** Player adds this week; counted against League.weeklyAddLimit. */
  adds: number;
  /** Hitting: the H/AB behind AVG. */
  hits: number;
  atBats: number;
  /**
   * Innings pitched, stored as outs (3 per inning) so 20 1/3 IP is exact --
   * baseball's "20.1" notation is a display format, not a decimal.
   */
  outsPitched: number;
}

export interface Matchup {
  week: number;
  opponentName: string;
  categories: MatchupCategory[];
  /** Ours and the opponent's supporting totals for this week. */
  totals?: { mine: TeamWeekTotals; theirs: TeamWeekTotals };
  /** League's weekly innings minimum for ERA/WHIP, in outs; null if none. */
  minOutsPitched?: number | null;
  /** Scoring days left in the week, including today. */
  daysRemaining: number;
  /** When the matchup ends, ISO. */
  endsAt: string;
}

/** Win-loss-tie record in matchups (one result per week, head-to-head). */
export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
}

/**
 * One regular-season meeting with an opponent. Every team plays every other
 * team twice, so a season series is two of these. Scores are categories won
 * that week ("8-1"); categories that finish level count for neither side.
 */
export interface Meeting {
  week: number;
  status: 'final' | 'live' | 'upcoming';
  /** Categories won by us / them / level. Null until the meeting starts. */
  mine: number | null;
  theirs: number | null;
  ties: number | null;
}

/** Everything the Matchup screen shows about this week's opponent. */
export interface OpponentDetail {
  team: Team;
  record: TeamRecord;
  /** Their roster, with this week's stats in `weekStats` like our own. */
  players: Player[];
  /** This season's meetings with them, in week order. */
  meetings: Meeting[];
  fetchedAt: string;
  sample?: boolean;
}

export type TransactionMove = 'add' | 'drop';

export interface TransactionPlayer {
  playerKey: string;
  name: string;
  move: TransactionMove;
}

export type TransactionKind = 'add' | 'drop' | 'add/drop' | 'trade';

export interface Transaction {
  id: string;
  kind: TransactionKind;
  teamKey: string;
  teamName: string;
  players: TransactionPlayer[];
  /** ISO 8601. */
  timestamp: string;
}

/** This week's opponent's activity, prioritized -- the whole point of the screen. */
export interface OpponentActivity {
  teamKey: string;
  teamName: string;
  /** Adds so far this week that count toward the league's weekly cap. */
  addsThisWeek: number;
  /** This team's transactions this week, newest first. */
  transactions: Transaction[];
}

export interface LeagueTransactions {
  /** Null outside a head-to-head week, or before the opponent is resolvable. */
  opponent: OpponentActivity | null;
  /** Recent activity across the whole league, newest first. */
  league: Transaction[];
  /** When this snapshot was taken, ISO 8601. */
  fetchedAt: string;
  /** True when this is the stand-in dataset rather than the real league. */
  sample?: boolean;
}
