import type { KeeperCandidate, LineupCall, Roster } from '../types';

// Stand-in data until Yahoo provisions API access. Shaped as the normalized
// domain model, not as Yahoo JSON -- see src/types.ts for why.

const today = new Date().toISOString();

export const mockRoster: Roster = {
  fetchedAt: today,
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
      seasonStats: { R: 54, HR: 19, RBI: 63, SB: 2, AVG: 0.254 },
      last14Stats: { R: 6, HR: 3, RBI: 9, SB: 0, AVG: 0.298 },
      percentOwned: 88,
    },
    {
      playerKey: 'p.2', name: 'Marcus Feld', mlbTeam: 'ATL',
      positions: ['1B', 'UTIL'], slot: '1B', status: null,
      startingToday: true, opponent: '@ NYM', opposingPitcher: 'R. Kwon',
      seasonStats: { R: 88, HR: 34, RBI: 101, SB: 4, AVG: 0.281 },
      last14Stats: { R: 9, HR: 4, RBI: 12, SB: 1, AVG: 0.310 },
      percentOwned: 99,
    },
    {
      playerKey: 'p.3', name: 'Devon Marsh', mlbTeam: 'CHC',
      positions: ['2B', 'SS'], slot: '2B', status: 'DTD',
      startingToday: null, opponent: 'vs MIL', opposingPitcher: 'T. Boyle',
      seasonStats: { R: 71, HR: 12, RBI: 48, SB: 22, AVG: 0.267 },
      last14Stats: { R: 4, HR: 0, RBI: 3, SB: 2, AVG: 0.213 },
      percentOwned: 76,
    },
    {
      playerKey: 'p.4', name: 'Eli Vargas', mlbTeam: 'LAD',
      positions: ['3B'], slot: '3B', status: null,
      startingToday: false, opponent: '@ SD', opposingPitcher: 'M. Stroh',
      seasonStats: { R: 79, HR: 27, RBI: 84, SB: 7, AVG: 0.292 },
      last14Stats: { R: 5, HR: 1, RBI: 6, SB: 0, AVG: 0.245 },
      percentOwned: 97,
    },
    {
      playerKey: 'p.5', name: 'Tyler Nakamura', mlbTeam: 'BAL',
      positions: ['SS'], slot: 'SS', status: null,
      startingToday: true, opponent: 'vs TB', opposingPitcher: 'C. Diaz',
      seasonStats: { R: 95, HR: 21, RBI: 70, SB: 31, AVG: 0.301 },
      last14Stats: { R: 11, HR: 2, RBI: 8, SB: 4, AVG: 0.340 },
      percentOwned: 100,
    },
    {
      playerKey: 'p.6', name: 'Andre Whitfield', mlbTeam: 'TEX',
      positions: ['OF'], slot: 'OF', status: null,
      startingToday: true, opponent: '@ OAK', opposingPitcher: 'S. Petit',
      seasonStats: { R: 66, HR: 15, RBI: 55, SB: 14, AVG: 0.248 },
      last14Stats: { R: 3, HR: 0, RBI: 2, SB: 1, AVG: 0.180 },
      percentOwned: 61,
    },
    {
      playerKey: 'p.7', name: 'Jonah Pike', mlbTeam: 'PHI',
      positions: ['OF', 'UTIL'], slot: 'OF', status: null,
      startingToday: null, opponent: 'vs WSH', opposingPitcher: null,
      seasonStats: { R: 58, HR: 22, RBI: 67, SB: 3, AVG: 0.236 },
      last14Stats: { R: 7, HR: 3, RBI: 10, SB: 0, AVG: 0.286 },
      percentOwned: 54,
    },
    {
      playerKey: 'p.8', name: 'Rafael Ortiz', mlbTeam: 'MIA',
      positions: ['SP'], slot: 'SP', status: null,
      startingToday: true, opponent: '@ ATL', opposingPitcher: null,
      seasonStats: { W: 12, SV: 0, K: 187, ERA: 3.12, WHIP: 1.08 },
      last14Stats: { W: 1, SV: 0, K: 21, ERA: 2.45, WHIP: 0.96 },
      percentOwned: 92,
    },
    {
      playerKey: 'p.9', name: 'Kenji Mori', mlbTeam: 'CLE',
      positions: ['SP'], slot: 'SP', status: null,
      startingToday: false, opponent: null, opposingPitcher: null,
      seasonStats: { W: 9, SV: 0, K: 154, ERA: 3.88, WHIP: 1.21 },
      last14Stats: { W: 0, SV: 0, K: 12, ERA: 5.14, WHIP: 1.48 },
      percentOwned: 71,
    },
    {
      playerKey: 'p.10', name: 'Brett Callahan', mlbTeam: 'MIN',
      positions: ['RP'], slot: 'RP', status: null,
      startingToday: null, opponent: 'vs KC', opposingPitcher: null,
      seasonStats: { W: 4, SV: 28, K: 81, ERA: 2.44, WHIP: 0.98 },
      last14Stats: { W: 0, SV: 3, K: 9, ERA: 1.80, WHIP: 0.80 },
      percentOwned: 85,
    },
    {
      playerKey: 'p.11', name: 'Sam Ruiz', mlbTeam: 'AZ',
      positions: ['OF'], slot: 'BN', status: null,
      startingToday: true, opponent: 'vs SF', opposingPitcher: 'L. Hahn',
      seasonStats: { R: 44, HR: 9, RBI: 38, SB: 18, AVG: 0.272 },
      last14Stats: { R: 8, HR: 2, RBI: 7, SB: 3, AVG: 0.325 },
      percentOwned: 33,
    },
    {
      playerKey: 'p.12', name: 'Owen Brandt', mlbTeam: 'BOS',
      positions: ['1B', '3B'], slot: 'BN', status: null,
      startingToday: false, opponent: '@ NYY', opposingPitcher: 'G. Cole Jr.',
      seasonStats: { R: 39, HR: 11, RBI: 41, SB: 1, AVG: 0.229 },
      last14Stats: { R: 2, HR: 0, RBI: 1, SB: 0, AVG: 0.167 },
      percentOwned: 22,
    },
    {
      playerKey: 'p.13', name: 'Luis Carrasco', mlbTeam: 'STL',
      positions: ['SP', 'RP'], slot: 'IL', status: 'IL15',
      startingToday: false, opponent: null, opposingPitcher: null,
      seasonStats: { W: 7, SV: 2, K: 98, ERA: 4.02, WHIP: 1.30 },
      last14Stats: {},
      percentOwned: 40,
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
    reason: 'Not in tonight’s lineup. Slot is dead weight if left active.',
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
