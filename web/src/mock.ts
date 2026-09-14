import type { KeeperCandidate, LineupCall, Roster } from './types';

// Stand-in data until Yahoo provisions API access. Shaped as the normalized
// domain model, not as Yahoo JSON -- see src/types.ts for why.

const today = new Date().toISOString();

/** Tonight's first pitch, so the countdown on Today has something to count to. */
const lockAt = (() => {
  const d = new Date();
  d.setHours(19, 5, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
})();

export const mockRoster: Roster = {
  fetchedAt: today,
  lockAt,
  sample: true,
  team: {
    teamKey: '458.l.000000.t.1',
    name: 'Bunts',
    leagueKey: '458.l.000000',
    logoUrl: null,
    rank: 3,
  },
  league: {
    leagueKey: '458.l.000000',
    name: 'Mock League',
    scoringCategories: ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP'],
    keeperSlots: 3,
    currentWeek: 23,
  },
  players: [
    {
      playerKey: 'p.1', name: 'Corbin Reyes', mlbTeam: 'SEA',
      positions: ['C'], slot: 'C', status: null,
      startingToday: true, opponent: 'vs HOU', opposingPitcher: 'J. Alvarez',
      seasonStats: { G: 118, R: 54, HR: 19, RBI: 63, SB: 2, AVG: 0.254 },
      last14Stats: { G: 12, R: 6, HR: 3, RBI: 9, SB: 0, AVG: 0.298 },
      percentOwned: 88,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '2-4, HR, 2 RBI', quality: 'good' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '1-4', quality: 'neutral' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '0-3, K', quality: 'bad' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '2-3, 2B, RBI', quality: 'good' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '1-3, BB', quality: 'neutral' },
      ],
      note: null,
    },
    {
      playerKey: 'p.2', name: 'Marcus Feld', mlbTeam: 'ATL',
      positions: ['1B', 'UTIL'], slot: '1B', status: null,
      startingToday: true, opponent: '@ NYM', opposingPitcher: 'R. Kwon',
      seasonStats: { G: 141, R: 88, HR: 34, RBI: 101, SB: 4, AVG: 0.281 },
      last14Stats: { G: 13, R: 9, HR: 4, RBI: 12, SB: 1, AVG: 0.310 },
      percentOwned: 99,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '3-5, HR, 3 RBI', quality: 'good' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '2-4, 2B', quality: 'good' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '1-4, RBI', quality: 'neutral' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '2-4, HR', quality: 'good' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '1-5', quality: 'neutral' },
      ],
      note: null,
    },
    {
      playerKey: 'p.3', name: 'Devon Marsh', mlbTeam: 'CHC',
      positions: ['2B', 'SS'], slot: '2B', status: 'DTD',
      startingToday: null, opponent: 'vs MIL', opposingPitcher: 'T. Boyle',
      seasonStats: { G: 131, R: 71, HR: 12, RBI: 48, SB: 22, AVG: 0.267 },
      last14Stats: { G: 10, R: 4, HR: 0, RBI: 3, SB: 2, AVG: 0.213 },
      percentOwned: 76,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '0-4, 2 K', quality: 'bad' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '1-4, SB', quality: 'neutral' },
        { date: '2026-09-10', opponent: '@ ATL', summary: 'Did not play', quality: 'dnp' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '0-3', quality: 'bad' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '1-4', quality: 'neutral' },
      ],
      note: "Left game early Tuesday with tightness; listed day-to-day.",
    },
    {
      playerKey: 'p.4', name: 'Eli Vargas', mlbTeam: 'LAD',
      positions: ['3B'], slot: '3B', status: null,
      startingToday: false, opponent: '@ SD', opposingPitcher: 'M. Stroh',
      seasonStats: { G: 138, R: 79, HR: 27, RBI: 84, SB: 7, AVG: 0.292 },
      last14Stats: { G: 12, R: 5, HR: 1, RBI: 6, SB: 0, AVG: 0.245 },
      percentOwned: 97,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '1-4, RBI', quality: 'neutral' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '0-4, 2 K', quality: 'bad' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '2-4, HR', quality: 'good' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '1-3', quality: 'neutral' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '0-4', quality: 'bad' },
      ],
      note: null,
    },
    {
      playerKey: 'p.5', name: 'Tyler Nakamura', mlbTeam: 'BAL',
      positions: ['SS'], slot: 'SS', status: null,
      startingToday: true, opponent: 'vs TB', opposingPitcher: 'C. Diaz',
      seasonStats: { G: 144, R: 95, HR: 21, RBI: 70, SB: 31, AVG: 0.301 },
      last14Stats: { G: 13, R: 11, HR: 2, RBI: 8, SB: 4, AVG: 0.340 },
      percentOwned: 100,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '3-4, 2 SB', quality: 'good' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '2-4, HR, 2 RBI', quality: 'good' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '2-5, 2B', quality: 'good' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '1-4, BB', quality: 'neutral' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '2-3, SB', quality: 'good' },
      ],
      note: null,
    },
    {
      playerKey: 'p.6', name: 'Andre Whitfield', mlbTeam: 'TEX',
      positions: ['OF'], slot: 'OF', status: null,
      startingToday: true, opponent: '@ OAK', opposingPitcher: 'S. Petit',
      seasonStats: { G: 126, R: 66, HR: 15, RBI: 55, SB: 14, AVG: 0.248 },
      last14Stats: { G: 12, R: 3, HR: 0, RBI: 2, SB: 1, AVG: 0.180 },
      percentOwned: 61,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '0-4', quality: 'bad' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '0-3, 2 K', quality: 'bad' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '1-4', quality: 'neutral' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '0-4, K', quality: 'bad' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '1-3, BB', quality: 'neutral' },
      ],
      note: null,
    },
    {
      playerKey: 'p.7', name: 'Jonah Pike', mlbTeam: 'PHI',
      positions: ['OF', 'UTIL'], slot: 'OF', status: null,
      startingToday: null, opponent: 'vs WSH', opposingPitcher: null,
      seasonStats: { G: 122, R: 58, HR: 22, RBI: 67, SB: 3, AVG: 0.236 },
      last14Stats: { G: 13, R: 7, HR: 3, RBI: 10, SB: 0, AVG: 0.286 },
      percentOwned: 54,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '2-4, HR, 3 RBI', quality: 'good' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '1-4', quality: 'neutral' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '2-5, HR', quality: 'good' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '0-4', quality: 'bad' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '1-4, RBI', quality: 'neutral' },
      ],
      note: null,
    },
    {
      playerKey: 'p.8', name: 'Rafael Ortiz', mlbTeam: 'MIA',
      positions: ['SP'], slot: 'SP', status: null,
      startingToday: true, opponent: '@ ATL', opposingPitcher: null,
      seasonStats: { G: 28, W: 12, SV: 0, K: 187, ERA: 3.12, WHIP: 1.08 },
      last14Stats: { G: 3, W: 1, SV: 0, K: 21, ERA: 2.45, WHIP: 0.96 },
      percentOwned: 92,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '7.0 IP, 1 ER, 9 K', quality: 'good' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '6.2 IP, 2 ER, 7 K', quality: 'good' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '5.1 IP, 3 ER, 5 K', quality: 'neutral' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '7.0 IP, 0 ER, 8 K', quality: 'good' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '6.0 IP, 3 ER, 6 K', quality: 'neutral' },
      ],
      note: null,
    },
    {
      playerKey: 'p.9', name: 'Kenji Mori', mlbTeam: 'CLE',
      positions: ['SP'], slot: 'SP', status: null,
      startingToday: false, opponent: null, opposingPitcher: null,
      seasonStats: { G: 27, W: 9, SV: 0, K: 154, ERA: 3.88, WHIP: 1.21 },
      last14Stats: { G: 3, W: 0, SV: 0, K: 12, ERA: 5.14, WHIP: 1.48 },
      percentOwned: 71,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '4.1 IP, 6 ER, 3 K', quality: 'bad' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '5.0 IP, 5 ER, 4 K', quality: 'bad' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '6.0 IP, 3 ER, 5 K', quality: 'neutral' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '7.0 IP, 1 ER, 8 K', quality: 'good' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '5.2 IP, 3 ER, 6 K', quality: 'neutral' },
      ],
      note: "Two rough starts in a row; command has been off since the break.",
    },
    {
      playerKey: 'p.10', name: 'Brett Callahan', mlbTeam: 'MIN',
      positions: ['RP'], slot: 'RP', status: null,
      startingToday: null, opponent: 'vs KC', opposingPitcher: null,
      seasonStats: { G: 58, W: 4, SV: 28, K: 81, ERA: 2.44, WHIP: 0.98 },
      last14Stats: { G: 6, W: 0, SV: 3, K: 9, ERA: 1.80, WHIP: 0.80 },
      percentOwned: 85,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '1.0 IP, SV, 2 K', quality: 'good' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '1.0 IP, SV', quality: 'good' },
        { date: '2026-09-10', opponent: '@ ATL', summary: 'Did not pitch', quality: 'dnp' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '1.0 IP, SV, 1 K', quality: 'good' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '1.0 IP, 1 H', quality: 'neutral' },
      ],
      note: null,
    },
    {
      playerKey: 'p.11', name: 'Sam Ruiz', mlbTeam: 'AZ',
      positions: ['OF'], slot: 'BN', status: null,
      startingToday: true, opponent: 'vs SF', opposingPitcher: 'L. Hahn',
      seasonStats: { G: 96, R: 44, HR: 9, RBI: 38, SB: 18, AVG: 0.272 },
      last14Stats: { G: 12, R: 8, HR: 2, RBI: 7, SB: 3, AVG: 0.325 },
      percentOwned: 33,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '2-4, SB, RBI', quality: 'good' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '3-5, 2B, SB', quality: 'good' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '1-4', quality: 'neutral' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: '2-4, SB', quality: 'good' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '2-3, 2B', quality: 'good' },
      ],
      note: null,
    },
    {
      playerKey: 'p.12', name: 'Owen Brandt', mlbTeam: 'BOS',
      positions: ['1B', '3B'], slot: 'BN', status: null,
      startingToday: true, opponent: '@ NYY', opposingPitcher: 'G. Cole Jr.',
      seasonStats: { G: 74, R: 39, HR: 11, RBI: 41, SB: 1, AVG: 0.229 },
      last14Stats: { G: 9, R: 2, HR: 0, RBI: 1, SB: 0, AVG: 0.167 },
      percentOwned: 22,
      recentGames: [
        { date: '2026-09-12', opponent: '@ SD', summary: '0-4, 2 K', quality: 'bad' },
        { date: '2026-09-11', opponent: 'vs MIL', summary: '1-4', quality: 'neutral' },
        { date: '2026-09-10', opponent: '@ ATL', summary: '0-3', quality: 'bad' },
        { date: '2026-09-09', opponent: 'vs HOU', summary: 'Did not play', quality: 'dnp' },
        { date: '2026-09-08', opponent: '@ NYM', summary: '1-4, RBI', quality: 'neutral' },
      ],
      note: null,
    },
    {
      playerKey: 'p.13', name: 'Luis Carrasco', mlbTeam: 'STL',
      positions: ['SP', 'RP'], slot: 'IL', status: 'IL15',
      startingToday: false, opponent: null, opposingPitcher: null,
      seasonStats: { G: 19, W: 7, SV: 2, K: 98, ERA: 4.02, WHIP: 1.30 },
      last14Stats: { G: 0 },
      percentOwned: 40,
      recentGames: [],
      note: "On the 15-day IL since Sept 2. No rehab assignment yet.",
    },
  ],
};

export const mockLineupCalls: LineupCall[] = [
  {
    playerKey: 'p.11', recommendation: 'start',
    reason: 'Starting today and hitting .325 over two weeks; Brandt is benched against a tough righty.',
    confidence: 0.78,
  },
  {
    playerKey: 'p.4', recommendation: 'sit',
    reason: 'Not in tonight’s lineup — the slot scores nothing. Owen Brandt (3B) is confirmed against NYY.',
    confidence: 0.95,
  },
  {
    playerKey: 'p.3', recommendation: 'hold',
    reason: 'Day-to-day and no lineup posted yet. Check again closer to first pitch.',
    confidence: 0.40,
  },
  {
    playerKey: 'p.9', recommendation: 'sit',
    reason: 'No start scheduled in this scoring period; 5.14 ERA over his last two outings.',
    confidence: 0.71,
  },
];

export const mockKeepers: KeeperCandidate[] = [
  { playerKey: 'p.5', rank: 1, score: 92.4, note: 'Top-10 producer in four of ten categories; cheap keeper round.' },
  { playerKey: 'p.2', rank: 2, score: 88.1, note: 'Carries power and average; no positional scarcity discount.' },
  { playerKey: 'p.8', rank: 3, score: 74.6, note: 'Only starter on the roster with a sub-3.20 ERA and 180+ K pace.' },
  { playerKey: 'p.1', rank: 4, score: 61.2, note: 'Catcher scarcity inflates value more than the raw line suggests.' },
  { playerKey: 'p.11', rank: 5, score: 55.9, note: 'Speed at 33% ownership; the cheapest real contributor available.' },
];
