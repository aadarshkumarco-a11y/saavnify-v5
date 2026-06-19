'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TabName } from '@/types';
import { BottomNav } from './bottom-nav';
import { MiniPlayer } from './mini-player';
import { FullPlayer } from './full-player';
import { YouTubePlayer } from '@/components/player/youtube-player';
import { usePlayerStore } from '@/stores/player-store';

interface AppShellProps {
  children: (activeTab: TabName) => React.ReactNode;
}

// Loading splash component
function LoadingSplash() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#090909]"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-3xl font-extrabold tracking-tight text-[#1DB954]"
        >
          SAAVNIFY
        </motion.div>

        {/* Loading bar */}
        <div className="w-32 h-0.5 bg-[#282828] rounded-full overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 bg-[#1DB954] rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentTrack, isFullPlayerOpen, setFullPlayerOpen } = usePlayerStore();

  // Show loading splash briefly on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle back button - close full player first
  useEffect(() => {
    const handlePopState = () => {
      if (isFullPlayerOpen) {
        setFullPlayerOpen(false);
        // Push state again so user stays on page
        try {
          window.history.pushState(null, '', window.location.href);
        } catch {
          // Ignore in Capacitor WebView if history manipulation fails
        }
      }
    };

    // Push initial state (guarded for Capacitor WebView)
    try {
      window.history.pushState(null, '', window.location.href);
    } catch {
      // Ignore in Capacitor WebView if history manipulation fails
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isFullPlayerOpen, setFullPlayerOpen]);

  // Push state when full player opens
  useEffect(() => {
    if (isFullPlayerOpen) {
      try {
        window.history.pushState(null, '', window.location.href);
      } catch {
        // Ignore in Capacitor WebView if history manipulation fails
      }
    }
  }, [isFullPlayerOpen]);

  // Prevent body scroll when full player is open
  useEffect(() => {
    if (isFullPlayerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullPlayerOpen]);

  const handleTabChange = useCallback((tab: TabName) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="flex flex-col h-dvh bg-[#090909] text-white overflow-hidden">
      {/* Loading Splash */}
      <AnimatePresence>
        {!isLoaded && <LoadingSplash />}
      </AnimatePresence>

      {/* YouTube Player (hidden, mounted once) */}
      <YouTubePlayer />

      {/* Main Content Area */}
      <main
        className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar transition-[padding-bottom] duration-300 ${
          currentTrack ? 'pb-[64px]' : ''
        }`}
        style={{
          paddingBottom: currentTrack
            ? `calc(64px + env(safe-area-inset-bottom, 0px))`
            : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="min-h-full"
          >
            {children(activeTab)}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mini Player */}
      <AnimatePresence>
        {currentTrack && !isFullPlayerOpen && (
          <MiniPlayer onExpand={() => setFullPlayerOpen(true)} />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Full Player Overlay */}
      <FullPlayer
        isOpen={isFullPlayerOpen}
        onClose={() => setFullPlayerOpen(false)}
      />
    </div>
  );
}
