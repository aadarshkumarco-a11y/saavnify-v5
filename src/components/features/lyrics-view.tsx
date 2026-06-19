'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic2, Search, ExternalLink, Music } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import type { Track } from '@/types';

interface LyricsLine {
  time: number; // seconds
  text: string;
}

interface LyricsViewProps {
  onClose: () => void;
}

// Generate simulated timestamped lyrics for demo purposes
function generateDemoLyrics(track: Track | null): LyricsLine[] {
  if (!track) return [];

  const title = track.title;
  const artist = track.artist;
  const duration = track.duration || 180;
  const lineCount = Math.max(8, Math.floor(duration / 12));
  const interval = duration / (lineCount + 2);

  const lyricsTemplates = [
    `🎵 ${title}`,
    `Performed by ${artist}`,
    '',
    '[Verse 1]',
    `Lost in the rhythm of ${title.toLowerCase()}`,
    'Every beat echoes through the night',
    'Searching for melodies that feel right',
    'The music carries me away',
    '',
    '[Chorus]',
    `This is the sound of ${title.toLowerCase()}`,
    'Rising up to the sky above',
    'Every note a declaration',
    'Of the power of love',
    '',
    '[Verse 2]',
    'Shadows dance upon the wall',
    'As the bass begins to fall',
    'Harmonies that intertwine',
    'Creating something so divine',
    '',
    '[Bridge]',
    'And when the morning comes',
    'The melody will carry on',
    'Through the silence and the noise',
    'Music is our voice',
    '',
    '[Outro]',
    `♪ ${title} ♪`,
    ' fading out...',
  ];

  const lines: LyricsLine[] = [];
  let currentTime = 2;

  for (let i = 0; i < lyricsTemplates.length && currentTime < duration - 5; i++) {
    lines.push({
      time: currentTime,
      text: lyricsTemplates[i % lyricsTemplates.length],
    });
    currentTime += interval;
  }

  return lines;
}

export function LyricsView({ onClose }: LyricsViewProps) {
  const { currentTrack, currentTime, duration, seek, isPlaying } = usePlayerStore();
  const [lyrics, setLyrics] = useState<LyricsLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate demo lyrics when track changes
  useEffect(() => {
    const demoLyrics = generateDemoLyrics(currentTrack);
    setLyrics(demoLyrics);
  }, [currentTrack]);

  // Find active line based on current time
  const currentLineIndex = useMemo(() => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        return i;
      }
    }
    return -1;
  }, [lyrics, currentTime]);

  useEffect(() => {
    setActiveLineIndex(currentLineIndex);
  }, [currentLineIndex]);

  // Auto-scroll to active line
  useEffect(() => {
    if (isUserScrolling || currentLineIndex < 0 || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const activeElement = container.querySelector(`[data-line-index="${currentLineIndex}"]`);

    if (activeElement) {
      const containerHeight = container.clientHeight;
      const elementTop = (activeElement as HTMLElement).offsetTop;
      const elementHeight = (activeElement as HTMLElement).clientHeight;
      const scrollTarget = elementTop - containerHeight / 2 + elementHeight / 2;

      container.scrollTo({
        top: scrollTarget,
        behavior: 'smooth',
      });
    }
  }, [currentLineIndex, isUserScrolling]);

  const handleUserScroll = useCallback(() => {
    setIsUserScrolling(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 3000);
  }, []);

  const handleLineClick = useCallback(
    (time: number) => {
      seek(time);
      setIsUserScrolling(false);
    },
    [seek]
  );

  const youtubeSearchUrl = currentTrack
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(currentTrack.title + ' ' + currentTrack.artist + ' lyrics')}`
    : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[110] flex flex-col"
      >
        {/* Blurred Background */}
        <div className="absolute inset-0 overflow-hidden">
          {currentTrack?.thumbnail && (
            <img
              src={currentTrack.thumbnail}
              alt=""
              className="w-full h-full object-cover scale-150 blur-[120px] opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#090909]/80 via-[#090909]/95 to-[#090909]" />
        </div>

        {/* Content */}
        <div className="relative flex flex-col h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors"
              aria-label="Close lyrics"
            >
              <X size={24} className="text-white/80" />
            </button>
            <div className="flex items-center gap-2">
              <Mic2 size={16} className="text-[#1DB954]" />
              <span className="text-sm font-semibold text-white">Lyrics</span>
            </div>
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 -mr-2 rounded-full active:bg-white/10 transition-colors"
              aria-label="Search for lyrics on YouTube"
            >
              <ExternalLink size={20} className="text-white/50" />
            </a>
          </div>

          {/* Track Info */}
          {currentTrack && (
            <div className="flex items-center gap-3 px-4 mb-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                {currentTrack.thumbnail ? (
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                    <Music size={20} className="text-white/30" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
                <p className="text-xs text-white/40 truncate">{currentTrack.artist}</p>
              </div>
            </div>
          )}

          {/* Lyrics Container */}
          <div className="flex-1 relative min-h-0">
            {/* Top gradient fade */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#090909] to-transparent z-10 pointer-events-none" />

            {/* Scrollable lyrics */}
            <div
              ref={scrollContainerRef}
              onScroll={handleUserScroll}
              className="h-full overflow-y-auto px-6 py-24 scroll-smooth"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {lyrics.length > 0 ? (
                <div className="space-y-1">
                  {lyrics.map((line, index) => {
                    const isActive = index === activeLineIndex;
                    const isPast = index < activeLineIndex;
                    const isSectionHeader = line.text.startsWith('[') && line.text.endsWith(']');
                    const isEmpty = line.text.trim() === '';

                    if (isEmpty) {
                      return <div key={index} className="h-6" data-line-index={index} />;
                    }

                    return (
                      <motion.div
                        key={index}
                        data-line-index={index}
                        onClick={() => handleLineClick(line.time)}
                        className={`
                          cursor-pointer rounded-lg px-3 py-1.5 transition-all duration-500
                          ${isActive ? 'border-l-2 border-[#1DB954]' : 'border-l-2 border-transparent'}
                          ${isSectionHeader ? 'mt-4 mb-1' : ''}
                          hover:bg-white/5 active:bg-white/10
                        `}
                        animate={{
                          scale: isActive ? 1 : 0.98,
                          opacity: isActive ? 1 : isPast ? 0.4 : 0.5,
                        }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      >
                        <p
                          className={`
                            transition-all duration-500 leading-relaxed
                            ${
                              isActive
                                ? 'text-lg font-bold text-white'
                                : isSectionHeader
                                  ? 'text-sm font-medium text-white/30 uppercase tracking-wider'
                                  : 'text-base text-white/50'
                            }
                          `}
                        >
                          {line.text}
                        </p>
                      </motion.div>
                    );
                  })}

                  {/* Bottom spacer */}
                  <div className="h-40" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-full bg-[#181818] flex items-center justify-center mb-4">
                    <Search size={32} className="text-white/20" />
                  </div>
                  <p className="text-white/50 text-base font-medium mb-1">Lyrics not available</p>
                  <p className="text-white/30 text-sm mb-4">
                    Try searching on YouTube for lyrics
                  </p>
                  <a
                    href={youtubeSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1DB954] text-[#090909] text-sm font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
                  >
                    <Search size={16} />
                    Search Lyrics
                  </a>
                </div>
              )}
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#090909] to-transparent z-10 pointer-events-none" />
          </div>

          {/* Playback indicator */}
          {isUserScrolling && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2"
            >
              <button
                onClick={() => {
                  setIsUserScrolling(false);
                  if (activeLineIndex >= 0) {
                    const container = scrollContainerRef.current;
                    const activeElement = container?.querySelector(
                      `[data-line-index="${activeLineIndex}"]`
                    );
                    if (activeElement && container) {
                      const containerHeight = container.clientHeight;
                      const elementTop = (activeElement as HTMLElement).offsetTop;
                      const elementHeight = (activeElement as HTMLElement).clientHeight;
                      const scrollTarget = elementTop - containerHeight / 2 + elementHeight / 2;
                      container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
                    }
                  }
                }}
                className="px-4 py-2 bg-[#1DB954] text-[#090909] text-xs font-semibold rounded-full shadow-lg"
              >
                Back to current line
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
