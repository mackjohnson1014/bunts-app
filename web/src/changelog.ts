/**
 * Single source of truth for the in-app changelog.
 *
 * Written for someone opening the app, not for someone reading a diff: each
 * entry says what changed about using Bunts, not which files moved.
 */

export interface Release {
  version: string;
  date: string;          // ISO, rendered in the app
  title: string;
  notes: string[];
}

export const RELEASES: Release[] = [
  {
    version: '2.3',
    date: '2026-10-05',
    title: 'Suggestions, rebuilt',
    notes: [
      'Suggest three kinds of move: a start/sit/watch call, a swap (bench player in for a starter, today or tomorrow), or a pickup (add anyone by name, with or without a drop). Start from the Suggestions screen or any player card.',
      'Each suggestion is a thread: agree or disagree, reply, counter a pickup with a different add/drop, then mark it \u201cMade it in Yahoo\u201d or Pass. Your own can be reopened or deleted; deleting sends no notification.',
      'The other person gets a notification for every new suggestion, reply, counter and decision, and tapping it opens that suggestion. After you send or mark one done, Bunts tells you whether it reached their phone.',
      'Home leads with open suggestions and a Today log of moves made and passed, plus adds used this week against the league\u2019s 6 (counting moves made through Bunts).',
      'Start/sit calls and swaps drop off once that day\u2019s remaining games start.',
    ],
  },
  {
    version: '2.1',
    date: '2026-10-05',
    title: 'Draft, depth and how the roster was built',
    notes: [
      'Player cards now have a transaction history: every move between teams this season, newest first \u2014 drafted, kept, dropped, claimed off waivers, picked up or traded \u2014 with your own team\u2019s moves marked.',
      'Keepers now has three tabs. Keepers is the running tally you already had.',
      'Draft lists your picks this season by round, which ones went to keepers, and which draftees are still on the roster.',
      'Roster build shows how many healthy players you have at each position against the slots you start, and flags where you\u2019re thin (no healthy backup) or have more than you can use. Below that is how every player joined \u2014 keeper, draft, waivers, free agent or trade \u2014 in date order; tap one to open his card.',
      'Roster build opens with your roster composition: two bars comparing your active hitters, starting pitchers and relievers with the ideal 12 / 10 / 3 split across your 25 active spots, and how many you\u2019re over or short in each.',
      'Your roster is updated to how you finished the season: Ryan Johnson, Walker Buehler and Robert Gasser are in, Hayden Wesneski and Keider Montero are out, and every player\u2019s slot matches Yahoo.',
      'Draft picks and transaction histories are placeholders for now, matching the made-up join dates. Real ones arrive with Yahoo.',
    ],
  },
  {
    version: '2.0',
    date: '2026-10-05',
    title: 'What a player has done for us',
    notes: [
      'Player cards have a new \u201cOn our team\u201d section: how he joined (drafted, kept, waivers, free agent or trade), the date, and how many days and games he\u2019s been ours.',
      'For anyone who joined mid-season, it shows his stats since he joined next to his full season, plus what share of each season total came while he was ours \u2014 so a July pickup is judged on what he did for you, not for his old team.',
      'AVG, ERA and WHIP compare his rate with us to his full-season rate, with an arrow when he\u2019s been better or worse for us.',
      'For now the join dates are placeholders so you can see how the section works \u2014 half the roster is marked as opening-day keepers and the rest have made-up add dates. Real ones arrive with Yahoo.',
    ],
  },
  {
    version: '1.9',
    date: '2026-09-28',
    title: 'Matchup, laid out like a scoreboard',
    notes: [
      '\u201cThis Week\u201d is now called Matchup, on the Home screen and in the tab bar.',
      'Each category now reads left to right like a scoreboard: your total on the left, your opponent\u2019s on the right, each in its own circle \u2014 whoever\u2019s leading gets theirs highlighted.',
      'How close a category is now sits centred between the two numbers, with the category name above it.',
      'The top of Matchup now shows the week\u2019s head-to-head score \u2014 categories you\u2019re leading vs. his, and how many are tied \u2014 instead of the Won/Live/Lost strip.',
      'Categories are now grouped into Hitting (AVG, R, HR, RBI, SB) and Pitching (W, K, ERA, WHIP, SV) instead of \u201cstill in play\u201d and \u201cdecided\u201d.',
      'Matchup also shows the numbers behind the categories for both teams: player adds used out of the weekly 6, hits and at-bats, and innings pitched against the 20-inning minimum \u2014 with a heads-up when either side is short.',
      'Tap your opponent\u2019s name to open his team: his overall record and place, his roster laid out just like yours (with this week\u2019s stats), and your season series with him.',
      'The season series shows both meetings and who holds the playoff tiebreaker \u2014 head-to-head record first, then combined category score across both weeks \u2014 plus who would hold it if this week ended as it stands.',
      'New: your chance of winning the week, shown under the categories, with the odds of a win, tie or loss and a projected category score. It\u2019s worked out from the live totals and how much each category can still move, so it firms up as the week runs out.',
    ],
  },
  {
    version: '1.8',
    date: '2026-09-17',
    title: 'A roster you can actually read',
    notes: [
      'Roster got a full pass: hitters and pitchers are cleaner two-way tabs, and each row shows just what matters instead of feeling cluttered.',
      'Stat category names (AVG, HR, ERA, and the rest) now stick to the top of the screen as you scroll, so every row can just show the numbers \u2014 more of your roster fits on screen at once.',
      'Tap any stat header to sort the list by it, best-first; today\u2019s probable starting pitchers now always stay pinned to the top of the Pitchers tab no matter how it\u2019s sorted.',
      'A player\u2019s team, position and tonight\u2019s matchup now sit right next to their name. Hitting stats are ordered AVG, R, HR, RBI, SB and pitching W, ERA, K, WHIP, SV to match how you actually scan them, and ERA/WHIP always show two decimal places.',
      'New: each player now shows a second row with their stats for the current week \u2014 green the moment a counting stat (HR, RBI, R, SB, W, K, SV) ticks up, or green/red against their own season rate for AVG/ERA/WHIP, with a neutral dot when nothing\u2019s moved.',
      'Long names (like Christian Encarnacion-Strand) no longer wrap onto a second line.',
    ],
  },
  {
    version: '1.7',
    date: '2026-09-16',
    title: 'Live MLB data instead of made-up sample stats',
    notes: [
      'While waiting on Yahoo, Roster used to show a sample team with hand-typed, fictional stats. It now shows your real 27-man roster instead, matched to your actual players, with real, live stats, tonight\u2019s game status, and injury info pulled straight from MLB.',
      'Injury/IL status now comes from an actual MLB source instead of guesswork, and updates on its own as things change \u2014 no more stale \u201cDTD\u201d tags.',
      'The attribution line at the bottom of Roster now correctly credits MLB Stats API for this data instead of Yahoo, since none of it is coming from Yahoo yet.',
    ],
  },
  {
    version: '1.6',
    date: '2026-09-16',
    title: 'Light mode',
    notes: [
      'Bunts now opens in light mode by default \u2014 a paper-and-ink look instead of the dark scoreboard.',
      'Flip back to dark mode any time from Settings \u2192 Appearance.',
    ],
  },
  {
    version: '1.5',
    date: '2026-09-15',
    title: 'A home screen and a place for waivers',
    notes: [
      'New Home tab, and it\u2019s where the app opens now: a grid of shortcuts to Today, Week, Roster, Keepers, Transactions and Settings.',
      'Settings is no longer one long scroll \u2014 four clear links (Account, Alerts, Changelog, About) that each open their own screen and remember where you left off.',
      'New Transactions tab: leads with your current opponent\u2019s activity and how many adds they\u2019ve used against the league\u2019s weekly cap, then the rest of the league below.',
      'A new alert toggle in Settings lets you get a push the moment your opponent makes a move.',
    ],
  },
  {
    version: '1.4',
    date: '2026-09-15',
    title: 'Roster that reads faster',
    notes: [
      'Roster now splits into Hitters and Pitchers, so you\u2019re not scrolling past starters to find the one player you\u2019re checking on.',
      'Every player shows two lights: whether they\u2019re in your Yahoo lineup, and whether they\u2019re actually starting tonight \u2014 the two can disagree, and now you can see it.',
      'Stats sit right next to the name instead of behind a separate sort button.',
      'Fixed Week showing a broken-page error instead of the same \u201cwaiting on Yahoo\u201d message you see everywhere else.',
      'Coming back to the app after your phone was asleep now reliably picks up where you left off, instead of sometimes freezing on old data.',
    ],
  },
  {
    version: '1.3',
    date: '2026-09-15',
    title: 'A proper front door',
    notes: [
      'Opening the app for the first time now shows a welcome screen rather than dropping you into a form.',
      'The app is called Unruly Bunts.',
      'Version number and the Yahoo attribution sit at the foot of the welcome screen.',
    ],
  },
  {
    version: '1.2',
    date: '2026-09-14',
    title: 'It knows what week it is',
    notes: [
      'New Week tab: your matchup category by category, showing what you have won, lost, and can still take.',
      'Start/sit now only cares about categories still in play — no more advice to chase steals you have already won.',
      'Keepers ranks all 23 players against your ten categories with the cut line at 12, and says what each one actually carries.',
      'A starting pitcher on his off day is no longer treated as scratched.',
      'Knows your real roster: C, 1B, 2B, SS, 3B, three OF, two UTIL, three SP, two RP, three P, seven bench and three IL.',
    ],
  },
  {
    version: '1.1',
    date: '2026-09-14',
    title: 'Setup that fits the screen',
    notes: [
      'Setup is three steps now — your name, your alerts, then turning notifications on.',
      'Fixed the text fields zooming the page on iPhone and pushing everything off the right edge.',
      'Settings can run you back through setup any time.',
    ],
  },
  {
    version: '1.0',
    date: '2026-09-14',
    title: 'Introduce yourself',
    notes: [
      'First time in, Bunts asks your name instead of guessing it from your email address.',
      'Each of you chooses which alerts reach your own phone — scratches, unposted lineups, suggestions.',
      'Quiet hours: alerts inside the window are dropped rather than saved up for the morning.',
      'Your name and settings follow you to any device you sign in on.',
    ],
  },
  {
    version: '0.9',
    date: '2026-09-14',
    title: 'Two owners',
    notes: [
      'Bunts now knows who you are — sign-in is handled before the app even loads.',
      'Open any player and send your co-owner a call: start, sit, or keep an eye, with a note.',
      'Their phone buzzes; yours does not. Suggestions land on Today with your name on them.',
      'New suggestions are marked until you have seen them.',
    ],
  },
  {
    version: '0.8',
    date: '2026-09-14',
    title: 'Stays current on its own',
    notes: [
      'Coming back to the app after a while refreshes it, instead of showing you what it fetched last time.',
      'A refresh button now sits next to the title, where you can actually find it.',
      'When a new version ships, a banner offers to update — no more closing and reopening.',
      'Player comparisons measure you against your own pace, so the arrows mean something.',
    ],
  },
  {
    version: '0.7',
    date: '2026-09-14',
    title: 'Player detail and a live countdown',
    notes: [
      'Tap any player for a full card: tonight\u2019s status, season against the last two weeks, and the last five games.',
      'Today counts down to first pitch and turns red inside half an hour.',
      'Every player shows a five-game form strip, so streaks are visible without opening anything.',
      'The roster sorts by lineup, name, or recent form.',
      'While Yahoo access is still pending, the app shows a sample team rather than an empty screen.',
    ],
  },
  {
    version: '0.6',
    date: '2026-09-14',
    title: 'Easier to install',
    notes: [
      'A one-time reminder shows how to add Bunts to your home screen, with the right steps for your phone.',
      'On Android it offers a real install button instead of instructions.',
      'Dismiss it and it stays gone; the instructions live on in Settings.',
    ],
  },
  {
    version: '0.5',
    date: '2026-09-14',
    title: 'Settings and changelog',
    notes: [
      'Alerts became Settings, with notification controls, this changelog, and app details in one place.',
      'You can send yourself a test notification from the phone instead of asking for one.',
      'Waiting on Yahoo now reads as a waiting state rather than an error.',
    ],
  },
  {
    version: '0.4',
    date: '2026-09-14',
    title: 'Backend live',
    notes: [
      'Notifications now come from the server, so they arrive whether or not any computer is awake.',
      'This device registers itself with the backend automatically.',
    ],
  },
  {
    version: '0.3',
    date: '2026-09-13',
    title: 'Notifications working',
    notes: [
      'Push notifications confirmed on iPhone, delivered through Apple.',
      'No Apple Developer account needed — Bunts installs from Safari as a home-screen app.',
    ],
  },
  {
    version: '0.2',
    date: '2026-09-13',
    title: 'Installable app',
    notes: [
      'Bunts became a real app you add to your home screen, with its own icon.',
      'Scoreboard design: bulb amber on a dark board, clay red for trouble.',
    ],
  },
  {
    version: '0.1',
    date: '2026-09-13',
    title: 'First screens',
    notes: [
      'Today, Roster, Keepers and Alerts, running on stand-in data.',
      'Today leads with what needs a decision before first pitch, not the full roster.',
      'Lineup status has three states — in, out, and not yet posted. Unposted is never reported as benched.',
    ],
  },
];

export const APP_VERSION = RELEASES[0].version;

export const formatDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
