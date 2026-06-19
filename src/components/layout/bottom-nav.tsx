'use client';

import { motion } from 'framer-motion';
import { Home, Search, Library, User } from 'lucide-react';
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

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
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
    </nav>
  );
}
