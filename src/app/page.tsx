'use client';

import { AppShell } from '@/components/layout/app-shell';
import { HomeTab } from '@/components/tabs/home-tab';
import { SearchTab } from '@/components/tabs/search-tab';
import { LibraryTab } from '@/components/tabs/library-tab';
import { ProfileTab } from '@/components/tabs/profile-tab';
import { ErrorBoundary } from '@/components/error-boundary';
import type { TabName } from '@/types';

export default function Home() {
  return (
    <ErrorBoundary>
      <AppShell>
        {(activeTab: TabName) => {
          switch (activeTab) {
            case 'home':
              return <HomeTab />;
            case 'search':
              return <SearchTab />;
            case 'library':
              return <LibraryTab />;
            case 'profile':
              return <ProfileTab />;
            default:
              return <HomeTab />;
          }
        }}
      </AppShell>
    </ErrorBoundary>
  );
}
