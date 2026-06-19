"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
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
  Volume2,
  VolumeX,
  GripVertical,
  X,
  Music,
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
import type { PlayerStyle, Track } from '@/types';

// ============================================================
// Shared Types & Helpers
// ============================================================

export interface PlayerVariantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlayerControls {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  queue: ReturnType<typeof usePlayerStore.getState>['queue'];
  queueIndex: number;
  sleepTimer: number | null;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  removeFromQueue: (i: number) => void;
  clearQueue: () => void;
  liked: boolean;
  toggleLike: (t: Track) => void;
  progress: number;
}

/** Pulls everything every variant needs from the stores. */
function usePlayerControls(): PlayerControls {
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
  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  return {
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
    liked,
    toggleLike,
    progress,
  };
}

/** Common swipe-to-close drag end handler. */
function makeDragEndHandler(onClose: () => void) {
  return (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) onClose();
  };
}

/** "Nothing playing" empty state, themed per-variant via className. */
function EmptyState({
  onClose,
  title = 'Nothing playing',
  subtitle = 'Play a song to see the player',
  className = '',
  iconColor = 'text-white/30',
  textColor = 'text-white/60',
  subColor = 'text-white/40',
}: {
  onClose: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
  iconColor?: string;
  textColor?: string;
  subColor?: string;
}) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.4 }}
      onDragEnd={makeDragEndHandler(onClose)}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <button
        onClick={onClose}
        className="absolute top-[calc(env(safe-area-inset-top)+16px)] left-4 p-2 rounded-full"
        aria-label="Close player"
      >
        <ChevronDown size={28} />
      </button>
      <Music size={56} className={iconColor} />
      <p className={`text-base font-medium ${textColor}`}>{title}</p>
      <p className={`text-sm ${subColor}`}>{subtitle}</p>
    </motion.div>
  );
}

// ============================================================
// Feature Sheets (Queue + Lyrics + EQ + Sleep + Share)
// ============================================================

interface FeatureSheetsProps {
  states: {
    queue: boolean;
    lyrics: boolean;
    eq: boolean;
    sleep: boolean;
    share: boolean;
  };
  setters: {
    setQueue: (v: boolean) => void;
    setLyrics: (v: boolean) => void;
    setEq: (v: boolean) => void;
    setSleep: (v: boolean) => void;
    setShare: (v: boolean) => void;
  };
  accent?: string;
}

function FeatureSheets({ states, setters, accent = '#1DB954' }: FeatureSheetsProps) {
  const { currentTrack, queue, queueIndex, removeFromQueue, clearQueue } = usePlayerStore();

  return (
    <>
      <Sheet open={states.queue} onOpenChange={setters.setQueue}>
        <SheetContent
          side="bottom"
          className="bg-[#121212] border-[#282828] rounded-t-2xl h-[70vh] max-h-[70vh] p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-[#282828]">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white text-lg font-bold">Queue</SheetTitle>
              {queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: accent }}
                >
                  Clear
                </button>
              )}
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1 h-[calc(70vh-80px)]">
            <div className="p-2">
              {currentTrack && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 mb-2">
                  <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                    {currentTrack.thumbnail ? (
                      <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                        <Music size={16} className="text-white/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: accent }}>
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-white/40 truncate">{currentTrack.artist}</p>
                  </div>
                  <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Now</span>
                </div>
              )}
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
                        <GripVertical size={14} className="text-white/20 flex-shrink-0" />
                        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                          {item.track.thumbnail ? (
                            <img src={item.track.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                              <Music size={16} className="text-white/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/80 truncate">{item.track.title}</p>
                          <p className="text-xs text-white/40 truncate">{item.track.artist}</p>
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

      {states.lyrics && <LyricsView onClose={() => setters.setLyrics(false)} />}
      <EqualizerView open={states.eq} onClose={() => setters.setEq(false)} />
      <SleepTimerView open={states.sleep} onClose={() => setters.setSleep(false)} />
      {currentTrack && (
        <ShareView
          track={currentTrack}
          open={states.share}
          onClose={() => setters.setShare(false)}
        />
      )}
    </>
  );
}

/** Hook returning feature-sheet state setters and the FeatureSheets element. */
function useFeatureSheets(accent = '#1DB954') {
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const sheets = (
    <FeatureSheets
      accent={accent}
      states={{ queue: queueOpen, lyrics: lyricsOpen, eq: eqOpen, sleep: sleepOpen, share: shareOpen }}
      setters={{ setQueue: setQueueOpen, setLyrics: setLyricsOpen, setEq: setEqOpen, setSleep: setSleepOpen, setShare: setShareOpen }}
    />
  );

  return {
    sheets,
    openQueue: () => setQueueOpen(true),
    openLyrics: () => setLyricsOpen(true),
    openEq: () => setEqOpen(true),
    openSleep: () => setSleepOpen(true),
    openShare: () => setShareOpen(true),
  };
}

/** Hook for seek bar interaction with local "drag time" state. */
function useSeek(duration: number, currentTime: number, seek: (t: number) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const displayTime = isDragging ? dragTime : currentTime;
  const onSeekStart = useCallback(() => {
    setIsDragging(true);
    setDragTime(currentTime);
  }, [currentTime]);
  const onSeekChange = useCallback((v: number[]) => setDragTime(v[0]), []);
  const onSeekEnd = useCallback(
    (v: number[]) => {
      seek(v[0]);
      setIsDragging(false);
    },
    [seek]
  );
  return { displayTime, isDragging, onSeekStart, onSeekChange, onSeekEnd };
}

// ============================================================
// 1. CLASSIC PLAYER  (default-like, solid bg + blurred thumbnail)
// ============================================================

export function ClassicPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openEq, openSleep, openShare } = useFeatureSheets('#1DB954');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);
  const [heart, setHeart] = useState(false);

  const handleLike = useCallback(() => {
    if (!c.currentTrack) return;
    setHeart(true);
    c.toggleLike(c.currentTrack);
    setTimeout(() => setHeart(false), 400);
  }, [c]);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-[#090909] text-white" />;
  }

  const remaining = `-${formatDuration(Math.max(0, c.duration - displayTime))}`;

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col bg-[#090909]"
      >
        {/* Blurred thumbnail bg */}
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={c.currentTrack.id}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              src={c.currentTrack.thumbnail}
              alt=""
              className="w-full h-full object-cover scale-150 blur-[100px] opacity-40"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-[#090909]/70 via-[#090909]/85 to-[#090909]" />
        </div>

        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {/* Top bar */}
          <div className="flex items-center justify-between py-3">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Minimize player">
              <ChevronDown size={28} className="text-white/80" />
            </button>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-medium">Now Playing</p>
            <button className="p-2 -mr-2 rounded-full active:bg-white/10" aria-label="More options">
              <MoreHorizontal size={22} className="text-white/80" />
            </button>
          </div>

          {/* Artwork */}
          <div className="flex-1 flex items-center justify-center px-2 py-2 min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={c.currentTrack.id}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-[340px] aspect-square rounded-[20px] overflow-hidden shadow-2xl shadow-black/60"
              >
                {c.currentTrack.thumbnail ? (
                  <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                    <Music size={80} className="text-white/20" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Track info */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="flex-1 min-w-0 mr-4">
              <motion.h2
                key={c.currentTrack.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-bold text-white truncate"
              >
                {c.currentTrack.title}
              </motion.h2>
              <p className="text-sm text-white/50 truncate mt-0.5">{c.currentTrack.artist}</p>
            </div>
            <motion.button
              onClick={handleLike}
              className="p-2 -mr-1 rounded-full active:bg-white/10"
              aria-label={c.liked ? 'Unlike' : 'Like'}
              whileTap={{ scale: 0.7 }}
            >
              <motion.div animate={heart ? { scale: [1, 1.3, 0.95, 1.15, 1] } : { scale: 1 }} transition={{ duration: 0.4 }}>
                <Heart
                  size={24}
                  className={c.liked ? 'text-[#1DB954]' : 'text-white/50'}
                  fill={c.liked ? '#1DB954' : 'none'}
                />
              </motion.div>
            </motion.button>
          </div>

          {/* Seek */}
          <div className="mt-2 mb-1">
            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-[#1DB954] [&_[data-slot=slider-thumb]]:w-4 [&_[data-slot=slider-thumb]]:h-4 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:opacity-0 [&:hover_[data-slot=slider-thumb]]:opacity-100"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-white/40 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-white/40 tabular-nums">{remaining}</span>
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center justify-between px-2 mt-2 mb-4">
            <button onClick={c.toggleShuffle} className="p-2 rounded-full active:bg-white/10" aria-label="Shuffle">
              <Shuffle size={20} className={c.shuffle ? 'text-[#1DB954]' : 'text-white/50'} />
            </button>
            <button onClick={c.previous} className="p-2 rounded-full active:bg-white/10" aria-label="Previous track">
              <SkipBack size={28} fill="#FFFFFF" className="text-white" />
            </button>
            <motion.button
              onClick={c.togglePlayPause}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shadow-black/30"
              aria-label={c.isPlaying ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
            >
              {c.isPlaying ? (
                <Pause size={28} fill="#090909" className="text-[#090909]" />
              ) : (
                <Play size={28} fill="#090909" className="text-[#090909] ml-1" />
              )}
            </motion.button>
            <button onClick={c.next} className="p-2 rounded-full active:bg-white/10" aria-label="Next track">
              <SkipForward size={28} fill="#FFFFFF" className="text-white" />
            </button>
            <button onClick={c.toggleRepeat} className="p-2 rounded-full active:bg-white/10 relative" aria-label="Repeat">
              {c.repeat === 'one' ? (
                <Repeat1 size={20} className="text-[#1DB954]" />
              ) : (
                <Repeat size={20} className={c.repeat === 'all' ? 'text-[#1DB954]' : 'text-white/50'} />
              )}
            </button>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between px-4 mb-4">
            <button onClick={openQueue} className="p-2 rounded-full active:bg-white/10" aria-label="Queue">
              <ListMusic size={20} className="text-white/50" />
            </button>
            <button onClick={openLyrics} className="p-2 rounded-full active:bg-white/10" aria-label="Lyrics">
              <Mic2 size={20} className="text-white/50" />
            </button>
            <div className="flex items-center gap-2 w-28">
              <button onClick={c.toggleMute} className="p-1 rounded-full" aria-label={c.muted ? 'Unmute' : 'Mute'}>
                {c.muted || c.volume === 0 ? (
                  <VolumeX size={16} className="text-white/50" />
                ) : (
                  <Volume2 size={16} className="text-white/50" />
                )}
              </button>
              <Slider
                min={0}
                max={100}
                value={[c.muted ? 0 : c.volume * 100]}
                onValueChange={(v) => c.setVolume(v[0] / 100)}
                className="flex-1 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-white/60 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:opacity-0 [&:hover_[data-slot=slider-thumb]]:opacity-100"
                aria-label="Volume"
              />
            </div>
            <button onClick={openEq} className="p-2 rounded-full active:bg-white/10" aria-label="Equalizer">
              <SlidersHorizontal size={20} className="text-white/50" />
            </button>
            <button
              onClick={openSleep}
              className={`p-2 rounded-full active:bg-white/10 ${c.sleepTimer ? 'text-[#1DB954]' : 'text-white/50'}`}
              aria-label="Sleep timer"
            >
              <Timer size={20} />
            </button>
            <button onClick={openShare} className="p-2 rounded-full active:bg-white/10" aria-label="Share">
              <Share2 size={20} className="text-white/50" />
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 2. MODERN PLAYER  (sleek dark, neon glow ring around art)
// ============================================================

export function ModernPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openSleep, openShare } = useFeatureSheets('#22d3ee');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-[#050507] text-white" />;
  }

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col bg-[#050507]"
      >
        {/* subtle radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(34,211,238,0.10), transparent 55%)',
          }}
        />

        <div className="relative flex flex-col h-full px-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {/* Top */}
          <div className="flex items-center justify-between py-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Close player">
              <ChevronDown size={26} className="text-white/70" />
            </button>
            <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/60">Modern</span>
            <button onClick={openQueue} className="p-2 -mr-2 rounded-full active:bg-white/10" aria-label="Queue">
              <ListMusic size={22} className="text-white/70" />
            </button>
          </div>

          {/* Artwork with pulsing glow */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-6">
            <div className="relative">
              {/* Pulsing glow ring */}
              <AnimatePresence>
                {c.isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -inset-6 rounded-[28px] blur-2xl"
                    style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.45), transparent 70%)' }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.85, 0.55] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-full h-full rounded-[28px]"
                      style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.35), transparent 70%)' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={c.currentTrack.id}
                  initial={{ scale: 0.9, opacity: 0, rotateX: 20 }}
                  animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-[78vw] max-w-[360px] aspect-square rounded-[24px] overflow-hidden shadow-2xl"
                  style={{ boxShadow: '0 0 60px rgba(34,211,238,0.25)' }}
                >
                  {c.currentTrack.thumbnail ? (
                    <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#111] flex items-center justify-center">
                      <Music size={80} className="text-white/20" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Track info (centered, minimal) */}
          <div className="text-center mt-2 mb-6">
            <motion.h2
              key={c.currentTrack.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-semibold text-white truncate px-4"
            >
              {c.currentTrack.title}
            </motion.h2>
            <p className="text-sm text-cyan-300/70 truncate mt-1 px-4">{c.currentTrack.artist}</p>
          </div>

          {/* Seek */}
          <div className="mb-6">
            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-[3px] [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-cyan-400 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-cyan-300 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:shadow-[0_0_12px_rgba(34,211,238,0.8)] [&_[data-slot=slider-thumb]]:opacity-100"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-2">
              <span className="text-[11px] text-white/40 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-white/40 tabular-nums">{formatDuration(c.duration)}</span>
            </div>
          </div>

          {/* Minimal controls */}
          <div className="flex items-center justify-center gap-10 mb-6">
            <button onClick={c.previous} className="p-2 active:scale-90 transition-transform" aria-label="Previous track">
              <SkipBack size={30} className="text-white/80" />
            </button>
            <motion.button
              onClick={c.togglePlayPause}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', boxShadow: '0 0 40px rgba(34,211,238,0.5)' }}
              aria-label={c.isPlaying ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              {c.isPlaying ? (
                <Pause size={32} className="text-[#050507]" fill="#050507" />
              ) : (
                <Play size={32} className="text-[#050507] ml-1" fill="#050507" />
              )}
            </motion.button>
            <button onClick={c.next} className="p-2 active:scale-90 transition-transform" aria-label="Next track">
              <SkipForward size={30} className="text-white/80" />
            </button>
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-center gap-8 pb-4">
            <button onClick={openLyrics} className="p-2 active:scale-90 transition-transform" aria-label="Lyrics">
              <Mic2 size={18} className="text-white/40" />
            </button>
            <button onClick={openSleep} className="p-2 active:scale-90 transition-transform" aria-label="Sleep timer">
              <Timer size={18} className={c.sleepTimer ? 'text-cyan-300' : 'text-white/40'} />
            </button>
            <button onClick={openShare} className="p-2 active:scale-90 transition-transform" aria-label="Share">
              <Share2 size={18} className="text-white/40" />
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 3. SPOTIFY PLAYER  (Spotify-inspired, big bold title, green)
// ============================================================

export function SpotifyPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openEq, openSleep, openShare } = useFeatureSheets('#1DB954');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-black text-white" />;
  }

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col bg-black"
      >
        {/* Tinted bg from thumbnail */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={c.currentTrack.thumbnail}
            alt=""
            className="w-full h-full object-cover scale-125 blur-[80px] opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
        </div>

        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {/* Top */}
          <div className="flex items-center justify-between py-3">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Close player">
              <ChevronDown size={26} className="text-white" />
            </button>
            <p className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">Playing from Playlist</p>
            <button className="p-2 -mr-2 rounded-full active:bg-white/10" aria-label="More options">
              <MoreHorizontal size={22} className="text-white" />
            </button>
          </div>

          {/* Album art (large) */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={c.currentTrack.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-[360px] aspect-square rounded-lg overflow-hidden shadow-2xl"
              >
                {c.currentTrack.thumbnail ? (
                  <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                    <Music size={80} className="text-white/20" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Title row */}
          <div className="flex items-end justify-between mt-2 mb-4">
            <div className="flex-1 min-w-0">
              <motion.h2
                key={c.currentTrack.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-white truncate"
              >
                {c.currentTrack.title}
              </motion.h2>
              <p className="text-base text-white/60 truncate mt-1">{c.currentTrack.artist}</p>
            </div>
            <button
              onClick={() => c.currentTrack && c.toggleLike(c.currentTrack)}
              className="p-2 -mr-1 rounded-full active:bg-white/10"
              aria-label={c.liked ? 'Unlike' : 'Like'}
            >
              <Heart
                size={28}
                className={c.liked ? 'text-[#1DB954]' : 'text-white/70'}
                fill={c.liked ? '#1DB954' : 'none'}
              />
            </button>
          </div>

          {/* Seek */}
          <div className="mb-4">
            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-range]]:bg-[#1DB954] [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:opacity-0 [&:hover_[data-slot=slider-thumb]]:opacity-100 [&:hover_[data-slot=slider-range]]:bg-[#1ed760]"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-white/60 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-white/60 tabular-nums">{formatDuration(c.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={c.toggleShuffle} className="p-2 active:scale-90 transition-transform" aria-label="Shuffle">
              <Shuffle size={22} className={c.shuffle ? 'text-[#1DB954]' : 'text-white/70'} />
            </button>
            <button onClick={c.previous} className="p-2 active:scale-90 transition-transform" aria-label="Previous track">
              <SkipBack size={32} className="text-white" fill="#FFFFFF" />
            </button>
            <motion.button
              onClick={c.togglePlayPause}
              className="w-16 h-16 rounded-full bg-[#1DB954] flex items-center justify-center"
              aria-label={c.isPlaying ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05, backgroundColor: '#1ed760' }}
            >
              {c.isPlaying ? (
                <Pause size={28} className="text-black" fill="#000" />
              ) : (
                <Play size={28} className="text-black ml-1" fill="#000" />
              )}
            </motion.button>
            <button onClick={c.next} className="p-2 active:scale-90 transition-transform" aria-label="Next track">
              <SkipForward size={32} className="text-white" fill="#FFFFFF" />
            </button>
            <button onClick={c.toggleRepeat} className="p-2 active:scale-90 transition-transform" aria-label="Repeat">
              {c.repeat === 'one' ? (
                <Repeat1 size={22} className="text-[#1DB954]" />
              ) : (
                <Repeat size={22} className={c.repeat === 'all' ? 'text-[#1DB954]' : 'text-white/70'} />
              )}
            </button>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-around pb-2">
            <button onClick={openQueue} className="flex flex-col items-center gap-1 p-2" aria-label="Queue">
              <ListMusic size={20} className="text-white/70" />
              <span className="text-[10px] text-white/50">Queue</span>
            </button>
            <button onClick={openLyrics} className="flex flex-col items-center gap-1 p-2" aria-label="Lyrics">
              <Mic2 size={20} className="text-white/70" />
              <span className="text-[10px] text-white/50">Lyrics</span>
            </button>
            <button onClick={openEq} className="flex flex-col items-center gap-1 p-2" aria-label="Equalizer">
              <SlidersHorizontal size={20} className="text-white/70" />
              <span className="text-[10px] text-white/50">Equalizer</span>
            </button>
            <button onClick={openSleep} className="flex flex-col items-center gap-1 p-2" aria-label="Sleep timer">
              <Timer size={20} className={c.sleepTimer ? 'text-[#1DB954]' : 'text-white/70'} />
              <span className="text-[10px] text-white/50">Timer</span>
            </button>
            <button onClick={openShare} className="flex flex-col items-center gap-1 p-2" aria-label="Share">
              <Share2 size={20} className="text-white/70" />
              <span className="text-[10px] text-white/50">Share</span>
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 4. LIQUID PLAYER  (fluid gradient blobs, floating art, glass)
// ============================================================

export function LiquidPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openSleep, openShare } = useFeatureSheets('#a855f7');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-[#0a0118] text-white" />;
  }

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#0a0118]"
      >
        {/* Animated blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ x: [0, 60, -40, 0], y: [0, -40, 60, 0], scale: [1, 1.2, 0.9, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[10%] left-[5%] w-72 h-72 rounded-full blur-3xl opacity-60"
            style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}
          />
          <motion.div
            animate={{ x: [0, -50, 30, 0], y: [0, 50, -30, 0], scale: [1, 0.8, 1.3, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-[15%] right-[5%] w-80 h-80 rounded-full blur-3xl opacity-60"
            style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)' }}
          />
          <motion.div
            animate={{ x: [0, 40, -30, 0], y: [0, -60, 40, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[40%] left-[40%] w-64 h-64 rounded-full blur-3xl opacity-50"
            style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }}
          />
          <div className="absolute inset-0 bg-[#0a0118]/40" />
        </div>

        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between py-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Close player">
              <ChevronDown size={26} className="text-white/80" />
            </button>
            <span className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/60 font-medium">Liquid</span>
            <button onClick={openQueue} className="p-2 -mr-2 rounded-full active:bg-white/10" aria-label="Queue">
              <ListMusic size={22} className="text-white/80" />
            </button>
          </div>

          {/* Floating album art */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-4">
            <motion.div
              animate={{ y: [0, -12, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={c.currentTrack.id}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-[74vw] max-w-[340px] aspect-square rounded-[28px] overflow-hidden"
                  style={{ boxShadow: '0 20px 60px -10px rgba(168,85,247,0.45)' }}
                >
                  {c.currentTrack.thumbnail ? (
                    <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                      <Music size={80} className="text-white/20" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Glass info card */}
          <div
            className="rounded-3xl p-5 mb-4 backdrop-blur-2xl"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <motion.h2
                  key={c.currentTrack.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl font-bold text-white truncate"
                >
                  {c.currentTrack.title}
                </motion.h2>
                <p className="text-sm text-fuchsia-200/70 truncate mt-0.5">{c.currentTrack.artist}</p>
              </div>
              <button
                onClick={() => c.currentTrack && c.toggleLike(c.currentTrack)}
                className="p-2 rounded-full active:bg-white/10"
                aria-label={c.liked ? 'Unlike' : 'Like'}
              >
                <Heart
                  size={24}
                  className={c.liked ? 'text-fuchsia-400' : 'text-white/70'}
                  fill={c.liked ? '#e879f9' : 'none'}
                />
              </button>
            </div>

            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-range]]:bg-fuchsia-400 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-fuchsia-300 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:shadow-[0_0_10px_rgba(232,121,249,0.8)]"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-1.5 mb-3">
              <span className="text-[11px] text-white/50 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-white/50 tabular-nums">{formatDuration(c.duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button onClick={c.previous} className="p-2 active:scale-90 transition-transform" aria-label="Previous track">
                <SkipBack size={26} className="text-white" fill="#FFFFFF" />
              </button>
              <motion.button
                onClick={c.togglePlayPause}
                className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-xl"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                aria-label={c.isPlaying ? 'Pause' : 'Play'}
                whileTap={{ scale: 0.9 }}
              >
                {c.isPlaying ? (
                  <Pause size={26} className="text-white" fill="#FFFFFF" />
                ) : (
                  <Play size={26} className="text-white ml-1" fill="#FFFFFF" />
                )}
              </motion.button>
              <button onClick={c.next} className="p-2 active:scale-90 transition-transform" aria-label="Next track">
                <SkipForward size={26} className="text-white" fill="#FFFFFF" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 pb-3">
            <button onClick={openLyrics} className="p-2 active:scale-90 transition-transform" aria-label="Lyrics">
              <Mic2 size={18} className="text-white/60" />
            </button>
            <button onClick={openSleep} className="p-2 active:scale-90 transition-transform" aria-label="Sleep timer">
              <Timer size={18} className={c.sleepTimer ? 'text-fuchsia-300' : 'text-white/60'} />
            </button>
            <button onClick={openShare} className="p-2 active:scale-90 transition-transform" aria-label="Share">
              <Share2 size={18} className="text-white/60" />
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 5. CLOUD GLOW PLAYER  (pastel gradient, soft glow halo, dreamy)
// ============================================================

export function CloudGlowPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openSleep, openShare } = useFeatureSheets('#f472b6');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-gradient-to-b from-pink-200 to-purple-200 text-purple-900" iconColor="text-purple-400" textColor="text-purple-900" subColor="text-purple-600" />;
  }

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #fbcfe8 0%, #e9d5ff 50%, #bfdbfe 100%)' }}
      >
        {/* Soft floating clouds */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, 10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-10 w-40 h-20 rounded-full blur-2xl opacity-60"
          style={{ background: 'rgba(255,255,255,0.7)' }}
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-40 right-10 w-56 h-24 rounded-full blur-2xl opacity-60"
          style={{ background: 'rgba(255,255,255,0.6)' }}
        />

        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between py-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/30" aria-label="Close player">
              <ChevronDown size={26} className="text-purple-700" />
            </button>
            <span className="text-[10px] uppercase tracking-[0.3em] text-purple-600/70 font-semibold">Dreamy</span>
            <button onClick={openQueue} className="p-2 -mr-2 rounded-full active:bg-white/30" aria-label="Queue">
              <ListMusic size={22} className="text-purple-700" />
            </button>
          </div>

          {/* Album art with glow halo */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-4">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              {/* Big soft glow halo */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.85, 0.6] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-10 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.7), transparent 70%)' }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={c.currentTrack.id}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-[72vw] max-w-[320px] aspect-square rounded-[40px] overflow-hidden shadow-2xl"
                  style={{ boxShadow: '0 25px 60px -10px rgba(219,39,119,0.45)' }}
                >
                  {c.currentTrack.thumbnail ? (
                    <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-pink-200 flex items-center justify-center">
                      <Music size={80} className="text-purple-300" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Track info */}
          <div className="text-center mt-2 mb-4">
            <motion.h2
              key={c.currentTrack.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-purple-900 truncate px-4"
            >
              {c.currentTrack.title}
            </motion.h2>
            <p className="text-base text-pink-700/80 truncate mt-1 px-4">{c.currentTrack.artist}</p>
          </div>

          {/* Seek */}
          <div className="mb-5">
            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/50 [&_[data-slot=slider-range]]:bg-pink-400 [&_[data-slot=slider-thumb]]:w-4 [&_[data-slot=slider-thumb]]:h-4 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-pink-400 [&_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:shadow-md"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-purple-700/70 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-purple-700/70 tabular-nums">{formatDuration(c.duration)}</span>
            </div>
          </div>

          {/* Controls (cloud-shaped rounded) */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <button
              onClick={c.previous}
              className="w-14 h-14 rounded-[28px] flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}
              aria-label="Previous track"
            >
              <SkipBack size={22} className="text-purple-800" fill="#6b21a8" />
            </button>
            <motion.button
              onClick={c.togglePlayPause}
              className="w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'linear-gradient(135deg, #f472b6, #a855f7)', boxShadow: '0 10px 30px -5px rgba(219,39,119,0.6)' }}
              aria-label={c.isPlaying ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              {c.isPlaying ? (
                <Pause size={32} className="text-white" fill="#FFFFFF" />
              ) : (
                <Play size={32} className="text-white ml-1" fill="#FFFFFF" />
              )}
            </motion.button>
            <button
              onClick={c.next}
              className="w-14 h-14 rounded-[28px] flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}
              aria-label="Next track"
            >
              <SkipForward size={22} className="text-purple-800" fill="#6b21a8" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 pb-3">
            <button
              onClick={() => c.currentTrack && c.toggleLike(c.currentTrack)}
              className="p-2 active:scale-90 transition-transform"
              aria-label={c.liked ? 'Unlike' : 'Like'}
            >
              <Heart
                size={20}
                className={c.liked ? 'text-pink-600' : 'text-purple-700/60'}
                fill={c.liked ? '#db2777' : 'none'}
              />
            </button>
            <button onClick={openLyrics} className="p-2 active:scale-90 transition-transform" aria-label="Lyrics">
              <Mic2 size={20} className="text-purple-700/60" />
            </button>
            <button onClick={openSleep} className="p-2 active:scale-90 transition-transform" aria-label="Sleep timer">
              <Timer size={20} className={c.sleepTimer ? 'text-pink-600' : 'text-purple-700/60'} />
            </button>
            <button onClick={openShare} className="p-2 active:scale-90 transition-transform" aria-label="Share">
              <Share2 size={20} className="text-purple-700/60" />
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 6. FROST PLAYER  (frosted glass, ice-blue accents)
// ============================================================

export function FrostPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openSleep, openShare } = useFeatureSheets('#7dd3fc');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-[#0c1929] text-white" />;
  }

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#0c1929]"
      >
        {/* Blurred thumbnail bg */}
        <div className="absolute inset-0">
          <img
            src={c.currentTrack.thumbnail}
            alt=""
            className="w-full h-full object-cover scale-150 blur-[80px] opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-900/40 via-[#0c1929]/60 to-[#0c1929]" />
        </div>

        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
          <div className="flex items-center justify-between py-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Close player">
              <ChevronDown size={26} className="text-sky-100" />
            </button>
            <span className="text-[10px] uppercase tracking-[0.3em] text-sky-300/70 font-medium">Frost</span>
            <button onClick={openQueue} className="p-2 -mr-2 rounded-full active:bg-white/10" aria-label="Queue">
              <ListMusic size={22} className="text-sky-100" />
            </button>
          </div>

          {/* Frosted art frame */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={c.currentTrack.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-[78vw] max-w-[360px] aspect-square rounded-3xl overflow-hidden backdrop-blur-xl"
                style={{
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 20px 50px -10px rgba(125,211,252,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {c.currentTrack.thumbnail ? (
                  <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-sky-900/40 flex items-center justify-center">
                    <Music size={80} className="text-sky-200/40" />
                  </div>
                )}
                {/* Frost overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.1) 100%)' }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Frosted info panel */}
          <div
            className="rounded-3xl p-5 mb-4 backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <motion.h2
                  key={c.currentTrack.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl font-bold text-sky-50 truncate"
                >
                  {c.currentTrack.title}
                </motion.h2>
                <p className="text-sm text-sky-200/70 truncate mt-0.5">{c.currentTrack.artist}</p>
              </div>
              <button
                onClick={() => c.currentTrack && c.toggleLike(c.currentTrack)}
                className="p-2 rounded-full active:bg-white/10"
                aria-label={c.liked ? 'Unlike' : 'Like'}
              >
                <Heart
                  size={24}
                  className={c.liked ? 'text-sky-300' : 'text-sky-100/70'}
                  fill={c.liked ? '#7dd3fc' : 'none'}
                />
              </button>
            </div>

            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-sky-100/20 [&_[data-slot=slider-range]]:bg-sky-300 [&_[data-slot=slider-thumb]]:w-3.5 [&_[data-slot=slider-thumb]]:h-3.5 [&_[data-slot=slider-thumb]]:bg-sky-100 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-sky-400 [&_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:shadow-[0_0_12px_rgba(125,211,252,0.6)]"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-1.5 mb-4">
              <span className="text-[11px] text-sky-100/60 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-sky-100/60 tabular-nums">{formatDuration(c.duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button onClick={c.previous} className="p-2 active:scale-90 transition-transform" aria-label="Previous track">
                <SkipBack size={26} className="text-sky-50" fill="#e0f2fe" />
              </button>
              <motion.button
                onClick={c.togglePlayPause}
                className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-xl"
                style={{ background: 'rgba(125,211,252,0.25)', border: '1px solid rgba(125,211,252,0.5)', boxShadow: '0 0 30px rgba(125,211,252,0.4)' }}
                aria-label={c.isPlaying ? 'Pause' : 'Play'}
                whileTap={{ scale: 0.9 }}
              >
                {c.isPlaying ? (
                  <Pause size={26} className="text-sky-50" fill="#e0f2fe" />
                ) : (
                  <Play size={26} className="text-sky-50 ml-1" fill="#e0f2fe" />
                )}
              </motion.button>
              <button onClick={c.next} className="p-2 active:scale-90 transition-transform" aria-label="Next track">
                <SkipForward size={26} className="text-sky-50" fill="#e0f2fe" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 pb-3">
            <button onClick={openLyrics} className="p-2 active:scale-90 transition-transform" aria-label="Lyrics">
              <Mic2 size={18} className="text-sky-100/60" />
            </button>
            <button onClick={openSleep} className="p-2 active:scale-90 transition-transform" aria-label="Sleep timer">
              <Timer size={18} className={c.sleepTimer ? 'text-sky-300' : 'text-sky-100/60'} />
            </button>
            <button onClick={openShare} className="p-2 active:scale-90 transition-transform" aria-label="Share">
              <Share2 size={18} className="text-sky-100/60" />
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 7. FOLD PLAYER  (3D folded album art card)
// ============================================================

export function FoldPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openSleep, openShare } = useFeatureSheets('#f59e0b');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-[#1a1a1a] text-white" />;
  }

  const thumb = c.currentTrack.thumbnail;

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col bg-[#1a1a1a]"
      >
        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between py-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Close player">
              <ChevronDown size={26} className="text-white/80" />
            </button>
            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-400/70 font-medium">Fold</span>
            <button onClick={openQueue} className="p-2 -mr-2 rounded-full active:bg-white/10" aria-label="Queue">
              <ListMusic size={22} className="text-white/80" />
            </button>
          </div>

          {/* Folded album art */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-6" style={{ perspective: '1200px' }}>
            <motion.div
              animate={c.isPlaying ? { rotateY: [0, -4, 0, 4, 0] } : { rotateY: 0 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-[78vw] max-w-[340px] aspect-[2/1]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Top half */}
              <div
                className="absolute top-0 left-0 right-0 h-1/2 overflow-hidden rounded-t-2xl shadow-2xl"
                style={{ transformOrigin: 'bottom', transform: 'rotateX(-8deg)', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}
              >
                {thumb ? (
                  <img src={thumb} alt={c.currentTrack.title} className="w-full h-[200%] object-cover object-top" />
                ) : (
                  <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                    <Music size={60} className="text-white/20" />
                  </div>
                )}
              </div>
              {/* Bottom half */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden rounded-b-2xl shadow-2xl"
                style={{ transformOrigin: 'top', transform: 'rotateX(8deg)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-[200%] object-cover object-bottom" />
                ) : (
                  <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                    <Music size={60} className="text-white/20" />
                  </div>
                )}
                {/* Shadow crease */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-black/40 to-transparent" />
              </div>
              {/* Center crease line */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-black/60 -translate-y-1/2" />
            </motion.div>
          </div>

          {/* Track info */}
          <div className="flex items-center justify-between mt-2 mb-3">
            <div className="flex-1 min-w-0 mr-3">
              <motion.h2
                key={c.currentTrack.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-bold text-white truncate"
              >
                {c.currentTrack.title}
              </motion.h2>
              <p className="text-sm text-white/50 truncate mt-0.5">{c.currentTrack.artist}</p>
            </div>
            <button
              onClick={() => c.currentTrack && c.toggleLike(c.currentTrack)}
              className="p-2 rounded-full active:bg-white/10"
              aria-label={c.liked ? 'Unlike' : 'Like'}
            >
              <Heart
                size={22}
                className={c.liked ? 'text-amber-400' : 'text-white/50'}
                fill={c.liked ? '#f59e0b' : 'none'}
              />
            </button>
          </div>

          {/* Seek */}
          <div className="mb-5">
            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-amber-400 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-amber-300 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:opacity-100"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-white/40 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-white/40 tabular-nums">{formatDuration(c.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-8 mb-6">
            <button onClick={c.previous} className="p-2 active:scale-90 transition-transform" aria-label="Previous track">
              <SkipBack size={28} className="text-white/80" fill="#FFFFFF" />
            </button>
            <motion.button
              onClick={c.togglePlayPause}
              className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center"
              style={{ boxShadow: '0 10px 30px -5px rgba(245,158,11,0.6)' }}
              aria-label={c.isPlaying ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              {c.isPlaying ? (
                <Pause size={26} className="text-black" fill="#000" />
              ) : (
                <Play size={26} className="text-black ml-1" fill="#000" />
              )}
            </motion.button>
            <button onClick={c.next} className="p-2 active:scale-90 transition-transform" aria-label="Next track">
              <SkipForward size={28} className="text-white/80" fill="#FFFFFF" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 pb-3">
            <button onClick={openLyrics} className="p-2 active:scale-90 transition-transform" aria-label="Lyrics">
              <Mic2 size={18} className="text-white/50" />
            </button>
            <button onClick={openSleep} className="p-2 active:scale-90 transition-transform" aria-label="Sleep timer">
              <Timer size={18} className={c.sleepTimer ? 'text-amber-400' : 'text-white/50'} />
            </button>
            <button onClick={openShare} className="p-2 active:scale-90 transition-transform" aria-label="Share">
              <Share2 size={18} className="text-white/50" />
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 8. GROOVE PLAYER  (vinyl record, spinning disc, SVG arc)
// ============================================================

export function GroovePlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openSleep, openShare } = useFeatureSheets('#dc2626');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-[#1c1410] text-white" />;
  }

  // SVG arc progress geometry
  const size = 300;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (displayTime / (c.duration || 1)));

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col bg-[#1c1410]"
      >
        {/* Wood-grain radial bg */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 35%, #3a2418 0%, #1c1410 70%)' }}
        />

        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between py-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Close player">
              <ChevronDown size={26} className="text-amber-100/80" />
            </button>
            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-400/70 font-semibold">Vinyl</span>
            <button onClick={openQueue} className="p-2 -mr-2 rounded-full active:bg-white/10" aria-label="Queue">
              <ListMusic size={22} className="text-amber-100/80" />
            </button>
          </div>

          {/* Vinyl record with SVG progress ring */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-4 relative">
            {/* Tonearm */}
            <div
              className="absolute top-6 right-8 origin-top-right z-10"
              style={{ transform: c.isPlaying ? 'rotate(28deg)' : 'rotate(0deg)', transition: 'transform 0.8s ease' }}
            >
              <div className="w-1.5 h-32 bg-gradient-to-b from-zinc-300 to-zinc-500 rounded-full shadow-lg" />
              <div className="absolute -bottom-2 -right-1 w-3 h-3 bg-zinc-700 rounded-sm" />
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-zinc-600 rounded-full" />
            </div>

            <div className="relative" style={{ width: size, height: size }}>
              {/* SVG progress arc */}
              <svg width={size} height={size} className="absolute inset-0 -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 0.2s linear' }}
                />
              </svg>

              {/* Spinning disc */}
              <motion.div
                animate={c.isPlaying ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-8 rounded-full overflow-hidden shadow-2xl"
                style={{ background: 'conic-gradient(from 0deg, #0a0a0a, #1a1a1a, #0a0a0a, #1a1a1a, #0a0a0a, #1a1a1a, #0a0a0a)' }}
              >
                {/* Grooves */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-white/5"
                    style={{
                      inset: `${10 + i * 4}%`,
                    }}
                  />
                ))}
                {/* Album art label center */}
                <div className="absolute inset-[28%] rounded-full overflow-hidden border-4 border-[#1c1410]">
                  {c.currentTrack.thumbnail ? (
                    <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                      <Music size={32} className="text-white/20" />
                    </div>
                  )}
                </div>
                {/* Center hole */}
                <div className="absolute inset-[48%] rounded-full bg-[#1c1410] border border-zinc-700" />
              </motion.div>
            </div>
          </div>

          {/* Track info */}
          <div className="text-center mt-2 mb-4">
            <motion.h2
              key={c.currentTrack.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-bold text-amber-50 truncate px-4"
            >
              {c.currentTrack.title}
            </motion.h2>
            <p className="text-sm text-amber-200/60 truncate mt-1 px-4">{c.currentTrack.artist}</p>
          </div>

          {/* Seek slider (linear, for accessibility) */}
          <div className="mb-5">
            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-amber-100/15 [&_[data-slot=slider-range]]:bg-red-500 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-amber-200 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-red-500 [&_[data-slot=slider-thumb]]:opacity-100"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-amber-100/60 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-amber-100/60 tabular-nums">{formatDuration(c.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button onClick={c.previous} className="p-2 active:scale-90 transition-transform" aria-label="Previous track">
              <SkipBack size={26} className="text-amber-100" fill="#fef3c7" />
            </button>
            <motion.button
              onClick={c.togglePlayPause}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center"
              style={{ boxShadow: '0 8px 30px -5px rgba(220,38,38,0.6)' }}
              aria-label={c.isPlaying ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.9 }}
            >
              {c.isPlaying ? (
                <Pause size={26} className="text-white" fill="#FFFFFF" />
              ) : (
                <Play size={26} className="text-white ml-1" fill="#FFFFFF" />
              )}
            </motion.button>
            <button onClick={c.next} className="p-2 active:scale-90 transition-transform" aria-label="Next track">
              <SkipForward size={26} className="text-amber-100" fill="#fef3c7" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 pb-3">
            <button
              onClick={() => c.currentTrack && c.toggleLike(c.currentTrack)}
              className="p-2 active:scale-90 transition-transform"
              aria-label={c.liked ? 'Unlike' : 'Like'}
            >
              <Heart
                size={18}
                className={c.liked ? 'text-red-500' : 'text-amber-100/60'}
                fill={c.liked ? '#dc2626' : 'none'}
              />
            </button>
            <button onClick={openLyrics} className="p-2 active:scale-90 transition-transform" aria-label="Lyrics">
              <Mic2 size={18} className="text-amber-100/60" />
            </button>
            <button onClick={openSleep} className="p-2 active:scale-90 transition-transform" aria-label="Sleep timer">
              <Timer size={18} className={c.sleepTimer ? 'text-red-500' : 'text-amber-100/60'} />
            </button>
            <button onClick={openShare} className="p-2 active:scale-90 transition-transform" aria-label="Share">
              <Share2 size={18} className="text-amber-100/60" />
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 9. POPSY PLAYER  (colorful, playful, blob art, bouncy)
// ============================================================

export function PopsyPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openSleep, openShare } = useFeatureSheets('#f97316');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 text-white" />;
  }

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #fb923c 0%, #ec4899 50%, #a855f7 100%)' }}
      >
        {/* Floating shapes */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-6 w-16 h-16 rounded-3xl bg-yellow-300/60 backdrop-blur-sm"
        />
        <motion.div
          animate={{ y: [0, 15, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-32 right-8 w-20 h-20 rounded-full bg-cyan-300/60 backdrop-blur-sm"
        />
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 right-6 w-10 h-10 bg-white/40 rounded-2xl backdrop-blur-sm rotate-12"
        />

        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between py-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-white/30" aria-label="Close player">
              <ChevronDown size={28} className="text-white" />
            </button>
            <span className="text-xs uppercase tracking-widest text-white/80 font-black">Popsy</span>
            <button onClick={openQueue} className="p-2 -mr-2 rounded-full active:bg-white/30" aria-label="Queue">
              <ListMusic size={24} className="text-white" />
            </button>
          </div>

          {/* Blob-shaped album art */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-6">
            <motion.div
              animate={{
                borderRadius: ['60% 40% 30% 70% / 60% 30% 70% 40%', '40% 60% 70% 30% / 50% 60% 30% 60%', '60% 40% 30% 70% / 60% 30% 70% 40%'],
                rotate: [0, 6, -6, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-[72vw] max-w-[340px] aspect-square overflow-hidden"
              style={{ boxShadow: '0 25px 60px -10px rgba(0,0,0,0.4)' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={c.currentTrack.id}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  {c.currentTrack.thumbnail ? (
                    <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                      <Music size={80} className="text-white/40" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Track info (centered, bold) */}
          <div className="text-center mt-2 mb-5">
            <motion.h2
              key={c.currentTrack.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-3xl font-black text-white truncate px-4 drop-shadow-lg"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}
            >
              {c.currentTrack.title}
            </motion.h2>
            <p className="text-lg font-bold text-white/80 truncate mt-1 px-4">{c.currentTrack.artist}</p>
          </div>

          {/* Seek (chunky rounded) */}
          <div className="mb-6">
            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-white/30 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-range]]:rounded-full [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:bg-yellow-300 [&_[data-slot=slider-thumb]]:border-4 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:shadow-lg"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-white font-bold tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-xs text-white font-bold tabular-nums">{formatDuration(c.duration)}</span>
            </div>
          </div>

          {/* Big bouncy controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <motion.button
              onClick={c.previous}
              className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center"
              aria-label="Previous track"
              whileTap={{ scale: 0.85, rotate: -10 }}
              whileHover={{ scale: 1.1 }}
              style={{ boxShadow: '0 6px 0 rgba(0,0,0,0.2)' }}
            >
              <SkipBack size={24} className="text-purple-600" fill="#9333ea" />
            </motion.button>
            <motion.button
              onClick={c.togglePlayPause}
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #fde047, #f97316)', boxShadow: '0 8px 0 rgba(0,0,0,0.25)' }}
              aria-label={c.isPlaying ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.88, y: 4 }}
              whileHover={{ scale: 1.05 }}
            >
              {c.isPlaying ? (
                <Pause size={36} className="text-white" fill="#FFFFFF" />
              ) : (
                <Play size={36} className="text-white ml-1" fill="#FFFFFF" />
              )}
            </motion.button>
            <motion.button
              onClick={c.next}
              className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center"
              aria-label="Next track"
              whileTap={{ scale: 0.85, rotate: 10 }}
              whileHover={{ scale: 1.1 }}
              style={{ boxShadow: '0 6px 0 rgba(0,0,0,0.2)' }}
            >
              <SkipForward size={24} className="text-purple-600" fill="#9333ea" />
            </motion.button>
          </div>

          {/* Bottom row (chunky pills) */}
          <div className="flex items-center justify-around pb-3">
            <motion.button
              onClick={() => c.currentTrack && c.toggleLike(c.currentTrack)}
              className="w-12 h-12 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center"
              aria-label={c.liked ? 'Unlike' : 'Like'}
              whileTap={{ scale: 0.85 }}
            >
              <Heart
                size={22}
                className={c.liked ? 'text-red-500' : 'text-white'}
                fill={c.liked ? '#ef4444' : 'none'}
              />
            </motion.button>
            <motion.button
              onClick={openLyrics}
              className="w-12 h-12 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center"
              aria-label="Lyrics"
              whileTap={{ scale: 0.85 }}
            >
              <Mic2 size={22} className="text-white" />
            </motion.button>
            <motion.button
              onClick={openSleep}
              className="w-12 h-12 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center"
              aria-label="Sleep timer"
              whileTap={{ scale: 0.85 }}
            >
              <Timer size={22} className={c.sleepTimer ? 'text-yellow-200' : 'text-white'} />
            </motion.button>
            <motion.button
              onClick={openShare}
              className="w-12 h-12 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center"
              aria-label="Share"
              whileTap={{ scale: 0.85 }}
            >
              <Share2 size={22} className="text-white" />
            </motion.button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// 10. MINIMAL PLAYER  (ultra-minimal, B&W, lots of negative space)
// ============================================================

export function MinimalPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-white text-black" iconColor="text-neutral-300" textColor="text-neutral-900" subColor="text-neutral-500" />;
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.4 }}
      onDragEnd={makeDragEndHandler(onClose)}
      className="fixed inset-0 z-[100] flex flex-col bg-white"
    >
      <div className="relative flex flex-col h-full px-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Top bar - just close */}
        <div className="flex items-center justify-between py-6">
          <button onClick={onClose} className="p-1 -ml-1" aria-label="Close player">
            <ChevronDown size={24} className="text-neutral-900" />
          </button>
          <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-medium">Minimal</span>
          <div className="w-8" />
        </div>

        {/* Lots of negative space + small art */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-12 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={c.currentTrack.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="w-44 h-44 rounded-lg overflow-hidden shadow-xl"
            >
              {c.currentTrack.thumbnail ? (
                <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover grayscale" />
              ) : (
                <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                  <Music size={48} className="text-neutral-300" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="text-center w-full">
            <motion.h2
              key={`title-${c.currentTrack.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-medium text-neutral-900 truncate"
            >
              {c.currentTrack.title}
            </motion.h2>
            <p className="text-sm text-neutral-500 truncate mt-1">{c.currentTrack.artist}</p>
          </div>
        </div>

        {/* Thin seek line */}
        <div className="mb-8">
          <Slider
            min={0}
            max={c.duration || 1}
            value={[displayTime]}
            onValueChange={onSeekChange}
            onPointerDown={onSeekStart}
            onValueCommit={onSeekEnd}
            className="w-full [&_[data-slot=slider-track]]:h-[2px] [&_[data-slot=slider-track]]:bg-neutral-200 [&_[data-slot=slider-range]]:bg-neutral-900 [&_[data-slot=slider-thumb]]:w-2.5 [&_[data-slot=slider-thumb]]:h-2.5 [&_[data-slot=slider-thumb]]:bg-neutral-900 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:shadow-none"
            aria-label="Seek"
          />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-neutral-400 tabular-nums">{formatDuration(displayTime)}</span>
            <span className="text-[10px] text-neutral-400 tabular-nums">{formatDuration(c.duration)}</span>
          </div>
        </div>

        {/* Minimal controls */}
        <div className="flex items-center justify-center gap-12 mb-10">
          <button onClick={c.previous} className="p-2 active:scale-90 transition-transform" aria-label="Previous track">
            <SkipBack size={26} className="text-neutral-900" />
          </button>
          <motion.button
            onClick={c.togglePlayPause}
            className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center"
            aria-label={c.isPlaying ? 'Pause' : 'Play'}
            whileTap={{ scale: 0.9 }}
          >
            {c.isPlaying ? (
              <Pause size={22} className="text-white" fill="#FFFFFF" />
            ) : (
              <Play size={22} className="text-white ml-0.5" fill="#FFFFFF" />
            )}
          </motion.button>
          <button onClick={c.next} className="p-2 active:scale-90 transition-transform" aria-label="Next track">
            <SkipForward size={26} className="text-neutral-900" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 11. PAPER PLAYER  (flat, beige/cream, paper-like cards)
// ============================================================

export function PaperPlayer({ isOpen, onClose }: PlayerVariantProps) {
  const c = usePlayerControls();
  const { sheets, openQueue, openLyrics, openEq, openSleep, openShare } = useFeatureSheets('#7c2d12');
  const { displayTime, onSeekStart, onSeekChange, onSeekEnd } = useSeek(c.duration, c.currentTime, c.seek);

  if (!isOpen) return null;
  if (!c.currentTrack) {
    return <EmptyState onClose={onClose} className="bg-[#f5efe0] text-neutral-900" iconColor="text-neutral-400" textColor="text-neutral-900" subColor="text-neutral-600" />;
  }

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={makeDragEndHandler(onClose)}
        className="fixed inset-0 z-[100] flex flex-col bg-[#f5efe0]"
      >
        {/* Paper texture noise (subtle dotted overlay) */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(120, 80, 40, 0.08) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />

        <div className="relative flex flex-col h-full px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between py-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full active:bg-neutral-900/10" aria-label="Close player">
              <ChevronDown size={26} className="text-neutral-900" />
            </button>
            <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold">Paper</span>
            <button onClick={openQueue} className="p-2 -mr-2 rounded-full active:bg-neutral-900/10" aria-label="Queue">
              <ListMusic size={22} className="text-neutral-900" />
            </button>
          </div>

          {/* Paper card with album art */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={c.currentTrack.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="relative w-[78vw] max-w-[340px] aspect-square bg-white rounded-sm p-3"
                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(120, 80, 40, 0.15)' }}
              >
                <div className="w-full h-full overflow-hidden rounded-sm">
                  {c.currentTrack.thumbnail ? (
                    <img src={c.currentTrack.thumbnail} alt={c.currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#ede4d0] flex items-center justify-center">
                      <Music size={60} className="text-neutral-400" />
                    </div>
                  )}
                </div>
                {/* Tape strip top */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-6 bg-amber-200/60 rotate-2" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Track info card */}
          <div className="bg-white rounded-sm p-4 mb-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <motion.h2
                  key={c.currentTrack.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-bold text-neutral-900 truncate"
                >
                  {c.currentTrack.title}
                </motion.h2>
                <p className="text-sm text-neutral-500 truncate mt-0.5">{c.currentTrack.artist}</p>
              </div>
              <button
                onClick={() => c.currentTrack && c.toggleLike(c.currentTrack)}
                className="p-2 rounded-full active:bg-neutral-900/10"
                aria-label={c.liked ? 'Unlike' : 'Like'}
              >
                <Heart
                  size={22}
                  className={c.liked ? 'text-red-700' : 'text-neutral-400'}
                  fill={c.liked ? '#b91c1c' : 'none'}
                />
              </button>
            </div>

            {/* Seek (flat, brown) */}
            <Slider
              min={0}
              max={c.duration || 1}
              value={[displayTime]}
              onValueChange={onSeekChange}
              onPointerDown={onSeekStart}
              onValueCommit={onSeekEnd}
              className="w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-neutral-200 [&_[data-slot=slider-range]]:bg-amber-800 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:bg-amber-800 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:shadow-md"
              aria-label="Seek"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-neutral-500 tabular-nums">{formatDuration(displayTime)}</span>
              <span className="text-[11px] text-neutral-500 tabular-nums">{formatDuration(c.duration)}</span>
            </div>
          </div>

          {/* Controls (flat paper buttons) */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={c.previous}
              className="w-12 h-12 rounded-sm bg-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              aria-label="Previous track"
            >
              <SkipBack size={20} className="text-neutral-900" fill="#000" />
            </button>
            <motion.button
              onClick={c.togglePlayPause}
              className="w-16 h-16 rounded-sm bg-amber-800 flex items-center justify-center active:scale-95 transition-transform"
              style={{ boxShadow: '0 3px 6px rgba(0,0,0,0.18)' }}
              aria-label={c.isPlaying ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.95 }}
            >
              {c.isPlaying ? (
                <Pause size={26} className="text-white" fill="#FFFFFF" />
              ) : (
                <Play size={26} className="text-white ml-1" fill="#FFFFFF" />
              )}
            </motion.button>
            <button
              onClick={c.next}
              className="w-12 h-12 rounded-sm bg-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              aria-label="Next track"
            >
              <SkipForward size={20} className="text-neutral-900" fill="#000" />
            </button>
          </div>

          {/* Bottom flat action row */}
          <div className="flex items-center justify-around pb-3">
            <button
              onClick={openLyrics}
              className="flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform"
              aria-label="Lyrics"
            >
              <div className="w-10 h-10 rounded-sm bg-white flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <Mic2 size={18} className="text-neutral-700" />
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">Lyrics</span>
            </button>
            <button
              onClick={openEq}
              className="flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform"
              aria-label="Equalizer"
            >
              <div className="w-10 h-10 rounded-sm bg-white flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <SlidersHorizontal size={18} className="text-neutral-700" />
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">EQ</span>
            </button>
            <button
              onClick={openSleep}
              className="flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform"
              aria-label="Sleep timer"
            >
              <div className="w-10 h-10 rounded-sm bg-white flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <Timer size={18} className={c.sleepTimer ? 'text-amber-800' : 'text-neutral-700'} />
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">Timer</span>
            </button>
            <button
              onClick={openShare}
              className="flex flex-col items-center gap-1 p-2 active:scale-95 transition-transform"
              aria-label="Share"
            >
              <div className="w-10 h-10 rounded-sm bg-white flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <Share2 size={18} className="text-neutral-700" />
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">Share</span>
            </button>
          </div>
        </div>
      </motion.div>
      {sheets}
    </>
  );
}

// ============================================================
// DISPATCHER
// ============================================================

interface PlayerVariantDispatcherProps extends PlayerVariantProps {
  style: PlayerStyle;
}

const VARIANT_MAP: Record<PlayerStyle, React.ComponentType<PlayerVariantProps>> = {
  classic: ClassicPlayer,
  modern: ModernPlayer,
  spotify: SpotifyPlayer,
  liquid: LiquidPlayer,
  cloudglow: CloudGlowPlayer,
  frost: FrostPlayer,
  fold: FoldPlayer,
  groove: GroovePlayer,
  popsy: PopsyPlayer,
  minimal: MinimalPlayer,
  paper: PaperPlayer,
};

export function PlayerVariant({ style, ...props }: PlayerVariantDispatcherProps) {
  const Variant = VARIANT_MAP[style] ?? ClassicPlayer;
  // Each variant handles its own `isOpen` gate and renders its own motion.div
  // entrance (slide up from bottom). We mount/unmount via a plain conditional
  // so the variant's initial->animate plays cleanly on open.
  return props.isOpen ? <Variant {...props} /> : null;
}
