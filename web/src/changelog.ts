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
