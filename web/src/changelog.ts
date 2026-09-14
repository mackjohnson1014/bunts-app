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
