'use client';

import { AppShell } from '@/components/layout/app-shell';
import { HomeTab } from '@/components/tabs/home-tab';
import { SearchTab } from '@/components/tabs/search-tab';
import { LibraryTab } from '@/components/tabs/library-tab';
import { ProfileTab } from '@/components/tabs/profile-tab';
import { HomeVariant, LibraryVariant } from '@/components/tabs/style-variants';
import {
  ExploreScreen,
  NewReleasesScreen,
  HistoryScreen,
  StatsScreen,
  ListenTogetherScreen,
  BackupRestoreScreen,
  SettingsScreen,
} from '@/components/screens';
import { ErrorBoundary } from '@/components/error-boundary';
import { useSettingsStore } from '@/stores/settings-store';
import type { TabName } from '@/types';

export default function Home() {
  const homeStyle = useSettingsStore((s) => s.homeStyle);
  const libraryStyle = useSettingsStore((s) => s.libraryStyle);

  return (
    <ErrorBoundary>
      <AppShell>
        {(activeTab: TabName) => {
          switch (activeTab) {
            case 'home':
              // Use the classic HomeTab for 'classic'; otherwise dispatch to variants
              if (homeStyle === 'classic') return <HomeTab />;
              return <HomeVariant style={homeStyle} />;
            case 'search':
              return <SearchTab />;
            case 'library':
              if (libraryStyle === 'classic') return <LibraryTab />;
              return <LibraryVariant style={libraryStyle} />;
            case 'profile':
              return <ProfileTab />;
            case 'explore':
              return <ExploreScreen />;
            case 'new-releases':
              return <NewReleasesScreen onOpenAlbum={() => {}} />;
            case 'history':
              return <HistoryScreen />;
            case 'stats':
              return <StatsScreen />;
            case 'listen-together':
              return <ListenTogetherScreen />;
            case 'backup':
              return <BackupRestoreScreen />;
            case 'settings':
              return <SettingsScreen />;
            default:
              return <HomeTab />;
          }
        }}
      </AppShell>
    </ErrorBoundary>
  );
}
