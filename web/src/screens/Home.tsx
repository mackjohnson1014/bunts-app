import type { ReactNode } from 'react';
import { Screen } from '../components';
import { KeepersIcon, RosterIcon, SettingsIcon, TodayIcon, WeekIcon } from '../icons';
import type { IconProps } from '../icons';
import type { Tab } from '../App';

type Section = Exclude<Tab, 'home'>;

const SECTIONS: { id: Section; label: string; Icon: (props: IconProps) => ReactNode }[] = [
  { id: 'today', label: 'Today', Icon: TodayIcon },
  { id: 'week', label: 'This Week', Icon: WeekIcon },
  { id: 'roster', label: 'Roster', Icon: RosterIcon },
  { id: 'keepers', label: 'Keepers', Icon: KeepersIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

/**
 * The landing screen: a grid of tiles, one per section, iPhone-home-screen
 * style. Replaces Today as the tab the app opens on -- Today is still a full
 * tab of its own, just no longer the default view.
 */
export default function Home({ onOpen }: { onOpen: (tab: Section) => void }) {
  return (
    <Screen title="Home">
      <div className="home-grid">
        {SECTIONS.map((s) => (
          <button key={s.id} className="home-tile" onClick={() => onOpen(s.id)}>
            <span className="home-tile-icon">
              <s.Icon className="home-tile-svg" />
            </span>
            <span className="home-tile-label">{s.label}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}
