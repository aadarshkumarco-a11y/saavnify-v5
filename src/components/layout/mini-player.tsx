'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Play, Pause, Heart, X, Music } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';

interface MiniPlayerProps {
  onExpand: () => void;
}

export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    play,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();

  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 100], [1, 0]);
  const scale = useTransform(y, [0, 100], [1, 0.95]);

  const isSwipingRef = useRef(false);
  const [isMarquee, setIsMarquee] = useState(false);
  const titleRef = useRef<HTMLParagraphElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = currentTrack ? isLiked(currentTrack.id) : false;

  // Check if title needs marquee
  useEffect(() => {
    const checkOverflow = () => {
      if (titleRef.current) {
        setIsMarquee(titleRef.current.scrollWidth > titleRef.current.clientWidth);
      }
    };
    checkOverflow();
    // Re-check when track changes
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [currentTrack?.title]);

  const handlePanStart = useCallback(() => {
    isSwipingRef.current = true;
  }, []);

  const handlePanEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      isSwipingRef.current = false;
      // If swiped up more than 50px, open full player
      if (info.offset.y < -50) {
        onExpand();
      }
    },
    [onExpand]
  );

  const handleTap = useCallback(() => {
    // Only expand if not swiping
    if (!isSwipingRef.current) {
      onExpand();
    }
  }, [onExpand]);

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ y, opacity, scale }}
        onPanStart={handlePanStart}
        onPanEnd={handlePanEnd}
        className="relative z-40"
      >
        {/* Progress bar (thin, at the very top of mini player) */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#1a1a1a] z-10">
          <motion.div
            className="h-full bg-[#1DB954]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </div>

        <div
          className="flex items-center gap-3 px-3 py-2 bg-[#181818] border-t border-[#1a1a1a] cursor-pointer active:bg-[#1e1e1e] transition-colors select-none"
          onClick={handleTap}
          role="button"
          aria-label="Open full player"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onExpand();
            }
          }}
        >
          {/* Thumbnail with Equalizer Animation */}
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
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
            {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="flex gap-[2px] items-end h-4">
                  <div className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-1" style={{ height: '4px' }} />
                  <div className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-2" style={{ height: '8px' }} />
                  <div className="w-[3px] bg-[#1DB954] rounded-full equalizer-bar-3" style={{ height: '6px' }} />
                </div>
              </div>
            )}
          </div>

          {/* Track Info with Marquee */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="overflow-hidden">
              {isMarquee ? (
                <div className="marquee-container">
                  <span className="text-sm font-medium text-white whitespace-nowrap inline-block marquee-content">
                    {currentTrack.title}&nbsp;&nbsp;&nbsp;&nbsp;{currentTrack.title}&nbsp;&nbsp;&nbsp;&nbsp;
                  </span>
                </div>
              ) : (
                <p ref={titleRef} className="text-sm font-medium text-white truncate leading-tight">
                  {currentTrack.title}
                </p>
              )}
            </div>
            <p className="text-xs text-white/40 truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(currentTrack);
            }}
            className="p-2 rounded-full active:bg-white/10 transition-colors"
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <motion.div whileTap={{ scale: 0.7 }}>
              <Heart
                size={18}
                className={`transition-colors duration-200 ${
                  liked ? 'text-[#1DB954]' : 'text-white/40'
                }`}
                fill={liked ? '#1DB954' : 'none'}
              />
            </motion.div>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="p-2 rounded-full active:bg-white/10 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <motion.div whileTap={{ scale: 0.85 }}>
              {isPlaying ? (
                <Pause size={22} fill="#FFFFFF" className="text-white" />
              ) : (
                <Play size={22} fill="#FFFFFF" className="text-white" />
              )}
            </motion.div>
          </button>

          {/* Close/Stop Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              usePlayerStore.setState({
                currentTrack: null,
                isPlaying: false,
                currentTime: 0,
                duration: 0,
                queue: [],
                queueIndex: -1,
              });
            }}
            className="p-1.5 rounded-full active:bg-white/10 transition-colors"
            aria-label="Close player"
          >
            <X size={16} className="text-white/30" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
