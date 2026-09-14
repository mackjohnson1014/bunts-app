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
  percentOwned: number | null;
  /** Newest first. Empty for a player who has not appeared recently. */
  recentGames: GameLine[];
  /** Injury or role note in plain language, when there is one. */
  note: string | null;
}

export interface League {
  leagueKey: string;
  name: string;
  /** Scoring categories in league order, e.g. ['R','HR','RBI','SB','AVG',...]. */
  scoringCategories: string[];
  /** How many players can be kept into next season. */
  keeperSlots: number;
  currentWeek: number | null;
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

export const ALERT_KINDS = ['scratched', 'unposted', 'suggestions'] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface Prefs {
  scratched: boolean;
  unposted: boolean;
  suggestions: boolean;
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

export interface SuggestionInput {
  playerKey: string;
  playerName: string;
  recommendation: 'start' | 'sit' | 'watch';
  note: string;
}

export interface Suggestion extends SuggestionInput {
  id: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  seenBy: string[];
  /** Added per-request by the API, relative to whoever is asking. */
  mine?: boolean;
  unread?: boolean;
}
