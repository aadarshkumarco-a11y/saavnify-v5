'use client';

import { motion } from 'framer-motion';
import { Home, Search, Library, User, Grid3x3 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';
import type { TabName } from '@/types';

interface BottomNavProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const tabs: { id: TabName; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'profile', label: 'Profile', icon: User },
];

const MORE_ITEMS: { id: TabName; label: string; desc: string }[] = [
  { id: 'explore', label: 'Explore', desc: 'Discover new music' },
  { id: 'new-releases', label: 'New Releases', desc: 'Fresh albums' },
  { id: 'history', label: 'History', desc: 'Recently played' },
  { id: 'stats', label: 'Stats & Insights', desc: 'Your listening data' },
  { id: 'listen-together', label: 'Listen Together', desc: 'Sync with friends' },
  { id: 'backup', label: 'Backup & Restore', desc: 'Export your library' },
  { id: 'settings', label: 'Settings', desc: 'Themes, player, more' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Highlight the "more" button if any of the more-items is active
  const moreActive = MORE_ITEMS.some((i) => i.id === activeTab);

  return (
    <>
      <nav className="flex items-center justify-around bg-[#090909] border-t border-[#1a1a1a] px-2 pb-[env(safe-area-inset-bottom)] relative z-50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="tap-target flex flex-col items-center justify-center py-2 px-3 relative transition-colors duration-200"
              role="tab"
              aria-label={tab.label}
              aria-selected={isActive}
            >
              <div className="relative">
                <Icon
                  size={22}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-[#1DB954]' : 'text-[#727272]'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1DB954] rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                  isActive ? 'text-[#1DB954]' : 'text-[#727272]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More button — opens sheet with extra screens */}
        <button
          onClick={() => setMoreOpen(true)}
          className="tap-target flex flex-col items-center justify-center py-2 px-3 relative transition-colors duration-200"
          role="tab"
          aria-label="More screens"
          aria-selected={moreActive}
        >
          <div className="relative">
            <Grid3x3
              size={22}
              className={`transition-colors duration-200 ${
                moreActive ? 'text-[#1DB954]' : 'text-[#727272]'
              }`}
              strokeWidth={moreActive ? 2.5 : 1.8}
            />
            {moreActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1DB954] rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </div>
          <span
            className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
              moreActive ? 'text-[#1DB954]' : 'text-[#727272]'
            }`}
          >
            More
          </span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-[#121212] border-[#1a1a1a]">
          <SheetHeader>
            <SheetTitle className="text-white text-left">More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4 pb-6">
            {MORE_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMoreOpen(false);
                  }}
                  className={`flex flex-col items-start gap-0.5 rounded-xl p-3 text-left transition-colors ${
                    active
                      ? 'bg-[#1DB954]/15 border border-[#1DB954]/40'
                      : 'bg-[#181818] border border-transparent hover:bg-[#222]'
                  }`}
                >
                  <span className={`text-sm font-semibold ${active ? 'text-[#1DB954]' : 'text-white'}`}>
                    {item.label}
                  </span>
                  <span className="text-[11px] text-[#727272]">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
