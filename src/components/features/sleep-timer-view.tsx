'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Moon, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { usePlayerStore } from '@/stores/player-store';

interface SleepTimerViewProps {
  open: boolean;
  onClose: () => void;
}

export function SleepTimerView({ open, onClose }: SleepTimerViewProps) {
  const { sleepTimer, sleepTimerEnd, setSleepTimer, pause, isPlaying, duration, currentTime } = usePlayerStore();
  const [remaining, setRemaining] = useState<number>(0);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fadeStartedRef = useRef(false);

  // Countdown logic
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (sleepTimerEnd && sleepTimerEnd > Date.now()) {
      const updateRemaining = () => {
        const now = Date.now();
        const left = Math.max(0, sleepTimerEnd - now);
        setRemaining(left);

        // Fade audio in last 10 seconds
        if (left <= 10000 && left > 0 && !fadeStartedRef.current && isPlaying) {
          fadeStartedRef.current = true;
          // Gradually reduce volume in last 10 seconds
          const fadeSteps = 10;
          const fadeInterval = 1000;
          let step = 0;
          const fadeTimer = setInterval(() => {
            step++;
            const { volume, setVolume } = usePlayerStore.getState();
            const newVolume = Math.max(0, volume * (1 - step / fadeSteps));
            setVolume(newVolume);
            if (step >= fadeSteps) {
              clearInterval(fadeTimer);
            }
          }, fadeInterval);
        }

        if (left <= 0) {
          // Timer expired - pause playback
          pause();
          setSleepTimer(null);
          fadeStartedRef.current = false;
        }
      };

      updateRemaining();
      intervalRef.current = setInterval(updateRemaining, 1000);
    } else {
      setRemaining(0);
      fadeStartedRef.current = false;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sleepTimerEnd, pause, setSleepTimer, isPlaying]);

  // Reset fade flag when timer is turned off
  useEffect(() => {
    if (!sleepTimer) {
      fadeStartedRef.current = false;
    }
  }, [sleepTimer]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleSetTimer = useCallback(
    (minutes: number | null) => {
      setSleepTimer(minutes);
      if (minutes === null) {
        fadeStartedRef.current = false;
      }
    },
    [setSleepTimer]
  );

  const handleEndOfTrack = useCallback(() => {
    // Set timer for remaining duration of track + 1 second
    const remainingSeconds = duration - currentTime;
    if (remainingSeconds > 0) {
      setSleepTimer(remainingSeconds / 60);
    }
  }, [duration, currentTime, setSleepTimer]);

  const handleCustomSubmit = useCallback(() => {
    const mins = parseInt(customMinutes);
    if (mins > 0 && mins <= 999) {
      setSleepTimer(mins);
      setShowCustomInput(false);
      setCustomMinutes('');
    }
  }, [customMinutes, setSleepTimer]);

  const presetOptions = [
    { label: '15 min', value: 15, icon: '🕐' },
    { label: '30 min', value: 30, icon: '🕑' },
    { label: '60 min', value: 60, icon: '🕒' },
    { label: '90 min', value: 90, icon: '🕓' },
  ];

  const isActive = sleepTimer !== null && sleepTimerEnd !== null && sleepTimerEnd > Date.now();

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[#121212] border-[#282828] rounded-t-2xl h-auto max-h-[70vh] p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-[#282828]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={18} className="text-[#1DB954]" />
              <SheetTitle className="text-white text-lg font-bold">Sleep Timer</SheetTitle>
            </div>
          </div>
          <SheetDescription className="sr-only">Set a sleep timer to pause music</SheetDescription>
        </SheetHeader>

        <div className="px-4 py-6 space-y-6">
          {/* Timer Display */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <AnimatePresence mode="wait">
                {isActive ? (
                  <motion.div
                    key="active"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    {/* Pulsing ring */}
                    <div className="relative">
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-[#1DB954]"
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <div className="w-28 h-28 rounded-full border-2 border-[#1DB954]/30 flex items-center justify-center bg-[#181818]">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-[#1DB954] tabular-nums font-mono">
                            {formatTime(remaining)}
                          </p>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
                            remaining
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-white/40 mt-3">
                      Music will pause after {sleepTimer} min
                    </p>

                    {/* Cancel button */}
                    <motion.button
                      onClick={() => handleSetTimer(null)}
                      className="mt-4 px-6 py-2.5 bg-[#282828] text-white/70 text-sm font-medium rounded-full hover:bg-[#333] transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancel Timer
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="inactive"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-28 h-28 rounded-full border-2 border-[#282828] flex items-center justify-center bg-[#181818]">
                      <Moon size={32} className="text-white/20" />
                    </div>
                    <p className="text-lg text-white/30 mt-3 font-medium">Off</p>
                    <p className="text-sm text-white/20 mt-1">
                      Select a time below to set timer
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Preset Grid */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-3">
              Set Timer
            </p>
            <div className="grid grid-cols-2 gap-3">
              {presetOptions.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => handleSetTimer(option.value)}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                    ${
                      sleepTimer === option.value && isActive
                        ? 'bg-[#1DB954]/15 border border-[#1DB954]/30'
                        : 'bg-[#181818] border border-transparent hover:bg-[#282828]'
                    }
                  `}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="text-lg">{option.icon}</span>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${sleepTimer === option.value && isActive ? 'text-[#1DB954]' : 'text-white/70'}`}>
                      {option.label}
                    </p>
                  </div>
                  {sleepTimer === option.value && isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto w-2 h-2 rounded-full bg-[#1DB954]"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* End of Track */}
          <motion.button
            onClick={handleEndOfTrack}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#181818] border border-transparent hover:bg-[#282828] transition-all duration-200"
            whileTap={{ scale: 0.97 }}
          >
            <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center">
              <Timer size={16} className="text-white/40" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white/70">End of Track</p>
              <p className="text-xs text-white/30">Stop when current song finishes</p>
            </div>
          </motion.button>

          {/* Custom Timer */}
          <div>
            {!showCustomInput ? (
              <motion.button
                onClick={() => setShowCustomInput(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#181818] border border-transparent hover:bg-[#282828] transition-all duration-200"
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center text-sm">
                  ⚙️
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white/70">Custom</p>
                  <p className="text-xs text-white/30">Set a custom duration</p>
                </div>
              </motion.button>
            ) : (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[#181818] rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="Minutes"
                    className="flex-1 bg-[#282828] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-[#1DB954] focus:outline-none placeholder:text-white/20"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                  />
                  <span className="text-sm text-white/30">min</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomMinutes('');
                    }}
                    className="flex-1 py-2.5 text-sm text-white/50 bg-[#282828] rounded-lg hover:bg-[#333] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customMinutes || parseInt(customMinutes) <= 0}
                    className="flex-1 py-2.5 text-sm font-medium text-[#090909] bg-[#1DB954] rounded-lg hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Set Timer
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
