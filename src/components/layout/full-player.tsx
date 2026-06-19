'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Share2,
  ListMusic,
  ChevronDown,
  MoreHorizontal,
  Timer,
  SlidersHorizontal,
  Mic2,
  Music,
  X,
  GripVertical,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';
import { formatDuration } from '@/lib/youtube-api';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { LyricsView } from '@/components/features/lyrics-view';
import { EqualizerView } from '@/components/features/equalizer-view';
import { SleepTimerView } from '@/components/features/sleep-timer-view';
import { ShareView } from '@/components/features/share-view';

interface FullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FullPlayer({ isOpen, onClose }: FullPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    queue,
    queueIndex,
    sleepTimer,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);

  // Swipe down to dismiss gesture
  const swipeY = useMotionValue(0);
  const swipeOpacity = useTransform(swipeY, [0, 300], [1, 0]);
  const swipeScale = useTransform(swipeY, [0, 300], [1, 0.92]);
  const isSwipingRef = useRef(false);

  const liked = currentTrack ? isLiked(currentTrack.id) : false;

  const displayTime = isDragging ? dragTime : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleSeekStart = useCallback(() => {
    setIsDragging(true);
    setDragTime(currentTime);
  }, [currentTime]);

  const handleSeekChange = useCallback(
    (value: number[]) => {
      setDragTime(value[0]);
    },
    []
  );

  const handleSeekEnd = useCallback(
    (value: number[]) => {
      seek(value[0]);
      setIsDragging(false);
    },
    [seek]
  );

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      setVolume(value[0] / 100);
    },
    [setVolume]
  );

  const remainingTimeString = useCallback((seconds: number) => {
    const remaining = Math.max(0, duration - seconds);
    return `-${formatDuration(remaining)}`;
  }, [duration]);

  // Swipe down to dismiss handlers
  const handlePanStart = useCallback(() => {
    isSwipingRef.current = true;
  }, []);

  const handlePanEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      isSwipingRef.current = false;
      // If swiped down more than 100px, close the player
      if (info.offset.y > 100) {
        onClose();
      } else {
        // Snap back
        swipeY.set(0);
      }
    },
    [onClose, swipeY]
  );

  // Animated like handler
  const handleLike = useCallback(() => {
    if (!currentTrack) return;
    setHeartAnimating(true);
    toggleLike(currentTrack);
    setTimeout(() => setHeartAnimating(false), 400);
  }, [currentTrack, toggleLike]);

  if (!currentTrack) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && !showLyrics && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }}
            style={{ y: swipeY, opacity: swipeOpacity, scale: swipeScale }}
            onPanStart={handlePanStart}
            onPanEnd={handlePanEnd}
            onPan={(_, info) => {
              if (info.offset.y > 0) {
                swipeY.set(info.offset.y);
              }
            }}
            className="fixed inset-0 z-[100] flex flex-col"
          >
            {/* Dynamic Blurred Background */}
            <div className="absolute inset-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentTrack.id}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  src={currentTrack.thumbnail}
                  alt=""
                  className="w-full h-full object-cover scale-150 blur-[100px] opacity-40"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-b from-[#090909]/70 via-[#090909]/85 to-[#090909]" />
            </div>

            {/* Content */}
            <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
              {/* Top Bar */}
              <div className="flex items-center justify-between py-3">
                <button
                  onClick={onClose}
                  className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="Minimize player"
                >
                  <ChevronDown size={28} className="text-white/80" />
                </button>
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-medium">
                    Now Playing
                  </p>
                </div>
                <button
                  className="p-2 -mr-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="More options"
                >
                  <MoreHorizontal size={22} className="text-white/80" />
                </button>
              </div>

              {/* Artwork Section */}
              <div className="flex-1 flex items-center justify-center px-2 py-2 min-h-0">
                <div className="relative w-full max-w-[340px]">
                  {/* Vinyl Animation (behind artwork) */}
                  <AnimatePresence>
                    {isPlaying && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.15, scale: 1.05 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 rounded-full overflow-hidden"
                        style={{ zIndex: 0 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          className="w-full h-full rounded-full"
                          style={{
                            background:
                              'conic-gradient(from 0deg, #1a1a1a, #333, #1a1a1a, #333, #1a1a1a)',
                          }}
                        >
                          <div className="absolute inset-[30%] rounded-full bg-[#090909]" />
                          <div className="absolute inset-[45%] rounded-full bg-[#1DB954]/20" />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Album Art with crossfade */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTrack.id}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="relative aspect-square rounded-[20px] overflow-hidden shadow-2xl shadow-black/60"
                      style={{ zIndex: 1 }}
                    >
                      {currentTrack.thumbnail ? (
                        <img
                          src={currentTrack.thumbnail}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                          <Music size={80} className="text-white/20" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Track Info */}
              <div className="flex items-center justify-between mt-4 mb-2">
                <div className="flex-1 min-w-0 mr-4">
                  <AnimatePresence mode="wait">
                    <motion.h2
                      key={currentTrack.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="text-xl font-bold text-white truncate"
                    >
                      {currentTrack.title}
                    </motion.h2>
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`artist-${currentTrack.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="text-sm text-white/50 truncate mt-0.5"
                    >
                      {currentTrack.artist}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <motion.button
                  onClick={handleLike}
                  className="p-2 -mr-1 rounded-full active:bg-white/10"
                  aria-label={liked ? 'Unlike' : 'Like'}
                  whileTap={{ scale: 0.7 }}
                >
                  <motion.div
                    animate={heartAnimating ? { scale: [1, 1.3, 0.95, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Heart
                      size={24}
                      className={`transition-colors duration-200 ${
                        liked ? 'text-[#1DB954]' : 'text-white/50'
                      }`}
                      fill={liked ? '#1DB954' : 'none'}
                    />
                  </motion.div>
                  {/* Heart burst particles */}
                  <AnimatePresence>
                    {heartAnimating && liked && (
                      <>
                        {[...Array(6)].map((_, i) => (
                          <motion.span
                            key={i}
                            initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                            animate={{
                              scale: 0.5,
                              opacity: 0,
                              x: Math.cos((i * 60) * Math.PI / 180) * 25,
                              y: Math.sin((i * 60) * Math.PI / 180) * 25,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-[#1DB954]"
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Progress Bar */}
              <div className="mt-2 mb-1">
                <Slider
                  min={0}
                  max={duration || 1}
                  value={[isDragging ? dragTime : currentTime]}
                  onValueChange={handleSeekChange}
                  onPointerDown={handleSeekStart}
                  onValueCommit={handleSeekEnd}
                  className="w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-range]]:bg-[#1DB954] [&_[data-slot=slider-range]]:rounded-full [&_[data-slot=slider-thumb]]:w-4 [&_[data-slot=slider-thumb]]:h-4 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:shadow-lg [&_[data-slot=slider-thumb]]:shadow-black/30 [&_[data-slot=slider-thumb]]:opacity-0 [&:hover_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:transition-opacity [&_[data-slot=slider-thumb]]:duration-150 [&_[data-slot=slider-thumb]]:after:content-[''] [&_[data-slot=slider-thumb]]:after:absolute [&_[data-slot=slider-thumb]]:after:inset-[-8px] [&_[data-slot=slider-thumb]]:after:rounded-full"
                  aria-label="Seek"
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px] text-white/40 tabular-nums">
                    {formatDuration(displayTime)}
                  </span>
                  <span className="text-[11px] text-white/40 tabular-nums">
                    {remainingTimeString(displayTime)}
                  </span>
                </div>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-between px-2 mt-2 mb-4">
                <button
                  onClick={toggleShuffle}
                  className="p-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="Shuffle"
                >
                  <Shuffle
                    size={20}
                    className={`transition-colors duration-200 ${
                      shuffle ? 'text-[#1DB954]' : 'text-white/50'
                    }`}
                  />
                </button>

                <button
                  onClick={previous}
                  className="p-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="Previous track"
                >
                  <SkipBack size={28} fill="#FFFFFF" className="text-white" />
                </button>

                <motion.button
                  onClick={togglePlayPause}
                  className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shadow-black/30"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <AnimatePresence mode="wait">
                    {isPlaying ? (
                      <motion.div
                        key="pause"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Pause size={28} fill="#090909" className="text-[#090909]" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="play"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Play size={28} fill="#090909" className="text-[#090909] ml-1" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                <button
                  onClick={next}
                  className="p-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="Next track"
                >
                  <SkipForward size={28} fill="#FFFFFF" className="text-white" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className="p-2 rounded-full active:bg-white/10 transition-colors relative"
                  aria-label="Repeat"
                >
                  {repeat === 'one' ? (
                    <Repeat1
                      size={20}
                      className="text-[#1DB954] transition-colors duration-200"
                    />
                  ) : (
                    <Repeat
                      size={20}
                      className={`transition-colors duration-200 ${
                        repeat === 'all' ? 'text-[#1DB954]' : 'text-white/50'
                      }`}
                    />
                  )}
                  {repeat !== 'off' && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1DB954] rounded-full" />
                  )}
                </button>
              </div>

              {/* Additional Controls Row */}
              <div className="flex items-center justify-between px-4 mb-4">
                <button
                  onClick={() => setShowQueue(true)}
                  className="p-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="Queue"
                >
                  <ListMusic
                    size={20}
                    className="text-white/50"
                  />
                </button>

                <button
                  onClick={() => setShowLyrics(true)}
                  className="p-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="Lyrics"
                >
                  <Mic2 size={20} className="text-white/50" />
                </button>

                {/* Volume Control (inline) */}
                <div className="flex items-center gap-2 w-28">
                  <button
                    onClick={toggleMute}
                    className="p-1 rounded-full active:bg-white/10"
                    aria-label={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted || volume === 0 ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                  </button>
                  <Slider
                    min={0}
                    max={100}
                    value={[muted ? 0 : volume * 100]}
                    onValueChange={handleVolumeChange}
                    className="flex-1 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-range]]:bg-white/60 [&_[data-slot=slider-range]]:rounded-full [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:opacity-0 [&:hover_[data-slot=slider-thumb]]:opacity-100 [&:hover_[data-slot=slider-range]]:bg-[#1DB954] [&_[data-slot=slider-thumb]]:transition-opacity [&_[data-slot=slider-range]]:transition-colors"
                    aria-label="Volume"
                  />
                </div>

                <button
                  onClick={() => setShowEqualizer(true)}
                  className="p-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="Equalizer"
                >
                  <SlidersHorizontal size={20} className="text-white/50" />
                </button>

                <button
                  onClick={() => setShowSleepTimer(true)}
                  className={`p-2 rounded-full active:bg-white/10 transition-colors relative ${
                    sleepTimer ? 'text-[#1DB954]' : 'text-white/50'
                  }`}
                  aria-label="Sleep timer"
                >
                  <Timer size={20} />
                  {sleepTimer && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#1DB954] rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setShowShare(true)}
                  className="p-2 rounded-full active:bg-white/10 transition-colors"
                  aria-label="Share"
                >
                  <Share2 size={20} className="text-white/50" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lyrics View */}
      {showLyrics && (
        <LyricsView onClose={() => setShowLyrics(false)} />
      )}

      {/* Queue Sheet */}
      <Sheet open={showQueue} onOpenChange={setShowQueue}>
        <SheetContent
          side="bottom"
          className="bg-[#121212] border-[#282828] rounded-t-2xl h-[70vh] max-h-[70vh] p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-[#282828]">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white text-lg font-bold">
                Queue
              </SheetTitle>
              {queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="text-[#1DB954] text-sm font-medium hover:text-[#1ed760] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1 h-[calc(70vh-80px)]">
            <div className="p-2">
              {/* Currently Playing */}
              {currentTrack && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 mb-2">
                  <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                    {currentTrack.thumbnail ? (
                      <img
                        src={currentTrack.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                        <Music size={16} className="text-white/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1DB954] truncate">
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      {currentTrack.artist}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                    Now
                  </span>
                </div>
              )}

              {/* Up Next */}
              {queue.filter((_, i) => i !== queueIndex).length > 0 && (
                <>
                  <p className="px-3 py-2 text-xs text-white/30 uppercase tracking-wider font-medium">
                    Up Next
                  </p>
                  {queue.map((item, index) => {
                    if (index === queueIndex) return null;
                    return (
                      <motion.div
                        key={`${item.track.id}-${item.addedAt}`}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg group hover:bg-white/5 transition-colors"
                      >
                        <GripVertical
                          size={14}
                          className="text-white/20 flex-shrink-0"
                        />
                        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                          {item.track.thumbnail ? (
                            <img
                              src={item.track.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                              <Music size={16} className="text-white/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/80 truncate">
                            {item.track.title}
                          </p>
                          <p className="text-xs text-white/40 truncate">
                            {item.track.artist}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromQueue(index)}
                          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                          aria-label="Remove from queue"
                        >
                          <X size={14} className="text-white/40" />
                        </button>
                      </motion.div>
                    );
                  })}
                </>
              )}

              {queue.length <= 1 && (
                <div className="flex flex-col items-center justify-center py-12 text-white/30">
                  <ListMusic size={40} className="mb-3" />
                  <p className="text-sm">Queue is empty</p>
                  <p className="text-xs mt-1">Songs you add will appear here</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Equalizer View */}
      <EqualizerView open={showEqualizer} onClose={() => setShowEqualizer(false)} />

      {/* Sleep Timer View */}
      <SleepTimerView open={showSleepTimer} onClose={() => setShowSleepTimer(false)} />

      {/* Share View */}
      {currentTrack && (
        <ShareView
          track={currentTrack}
          open={showShare}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
