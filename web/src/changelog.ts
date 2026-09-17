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
    version: '1.8',
    date: '2026-09-17',
    title: 'A roster you can actually read',
    notes: [
      'Roster got a full pass: hitters and pitchers are cleaner two-way tabs, and each row shows just what matters instead of feeling cluttered.',
      'Stat category names (AVG, HR, ERA, and the rest) now stick to the top of the screen as you scroll, so every row can just show the numbers \u2014 more of your roster fits on screen at once.',
      'Tap any stat header to sort the list by it, best-first; today\u2019s probable starting pitchers now always stay pinned to the top of the Pitchers tab no matter how it\u2019s sorted.',
      'A player\u2019s team, position and tonight\u2019s matchup now sit right next to their name. Hitting stats are ordered AVG, R, HR, RBI, SB and pitching W, ERA, K, WHIP, SV to match how you actually scan them, and ERA/WHIP always show two decimal places.',
      'New: each player now shows a second row with their stats for the current week, colored green or red against their own season pace \u2014 a hot or cold stretch jumps out without opening their card.',
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
