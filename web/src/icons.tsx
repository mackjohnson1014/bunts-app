import type { ReactNode } from 'react';

/**
 * Tab-bar and home-screen glyphs, drawn rather than pulled from an icon
 * library -- same approach as Logo.tsx and the section icons in
 * Settings.tsx. Plain stroke shapes on a 20x20 grid; color comes from
 * currentColor so the wrapping element (.tab, .home-tile-icon) controls it.
 */

export type IconProps = { className?: string };

export function HomeIcon({ className }: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.4 10 10 4.2 16.6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.3 8.6V16h9.4V8.6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.1 16v-4.3h3.8V16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function TodayIcon({ className }: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="12" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 8.2h12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 3.5v3M13 3.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="12.3" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function WeekIcon({ className }: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 15.5V10M10 15.5V5.3M15 15.5V8.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3.3 15.5h13.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function RosterIcon({ className }: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="5" y="4.2" width="10" height="13" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.7 4.2a2.3 2.3 0 0 1 4.6 0" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.3 9h5.4M7.3 12h5.4M7.3 15h3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function KeepersIcon({ className }: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3.6 11.9 7.5 16.2 8.1 13.1 11.1 13.8 15.4 10 13.4 6.2 15.4 6.9 11.1 3.8 8.1 8.1 7.5 10 3.6Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3.6v1.9M10 14.5v1.9M16.4 10h-1.9M5.5 10H3.6M14.5 5.5l-1.35 1.35M6.85 13.15 5.5 14.5M14.5 14.5l-1.35-1.35M6.85 6.85 5.5 5.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}
