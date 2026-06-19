import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Track, QueueItem, RepeatMode } from '@/types';

// Safe storage that handles WebView localStorage errors
const safeStorage = createJSONStorage(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // localStorage not available (WebView not ready)
  }
  // Fallback in-memory storage
  const store = new Map<string, string>();
  return {
    getItem: (name: string) => store.get(name) ?? null,
    setItem: (name: string, value: string) => { store.set(name, value); },
    removeItem: (name: string) => { store.delete(name); },
  };
});

interface PlayerStore {
  // State
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: QueueItem[];
  queueIndex: number;
  sleepTimer: number | null;
  sleepTimerEnd: number | null;
  isFullPlayerOpen: boolean;

  // Actions
  play: (track: Track, source?: string) => void;
  playQueue: (tracks: Track[], startIndex?: number, source?: string) => void;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track, source?: string) => void;
  addNext: (track: Track, source?: string) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setSleepTimer: (minutes: number | null) => void;
  setFullPlayerOpen: (open: boolean) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      muted: false,
      shuffle: false,
      repeat: 'off',
      queue: [],
      queueIndex: -1,
      sleepTimer: null,
      sleepTimerEnd: null,
      isFullPlayerOpen: false,

      play: (track: Track, source?: string) => {
        const queueItem: QueueItem = {
          track,
          addedAt: Date.now(),
          source,
        };
        set({
          currentTrack: track,
          isPlaying: true,
          currentTime: 0,
          duration: track.duration || 0,
          queue: [queueItem],
          queueIndex: 0,
        });
      },

      playQueue: (tracks: Track[], startIndex: number = 0, source?: string) => {
        if (tracks.length === 0) return;

        const queueItems: QueueItem[] = tracks.map((track) => ({
          track,
          addedAt: Date.now(),
          source,
        }));

        const safeIndex = Math.min(startIndex, tracks.length - 1);

        set({
          currentTrack: tracks[safeIndex],
          isPlaying: true,
          currentTime: 0,
          duration: tracks[safeIndex].duration || 0,
          queue: queueItems,
          queueIndex: safeIndex,
        });
      },

      pause: () => {
        set({ isPlaying: false });
      },

      resume: () => {
        if (get().currentTrack) {
          set({ isPlaying: true });
        }
      },

      togglePlayPause: () => {
        const { currentTrack, isPlaying } = get();
        if (currentTrack) {
          set({ isPlaying: !isPlaying });
        }
      },

      next: () => {
        const { queue, queueIndex, shuffle, repeat } = get();
        if (queue.length === 0) return;

        let nextIndex: number;

        if (repeat === 'one') {
          nextIndex = queueIndex;
        } else if (shuffle) {
          do {
            nextIndex = Math.floor(Math.random() * queue.length);
          } while (nextIndex === queueIndex && queue.length > 1);
        } else {
          nextIndex = queueIndex + 1;
          if (nextIndex >= queue.length) {
            if (repeat === 'all') {
              nextIndex = 0;
            } else {
              set({ isPlaying: false });
              return;
            }
          }
        }

        const nextTrack = queue[nextIndex]?.track;
        if (nextTrack) {
          set({
            currentTrack: nextTrack,
            queueIndex: nextIndex,
            currentTime: 0,
            duration: nextTrack.duration || 0,
            isPlaying: true,
          });
        }
      },

      previous: () => {
        const { queue, queueIndex, currentTime } = get();
        if (queue.length === 0) return;

        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        const prevIndex = queueIndex - 1;
        if (prevIndex < 0) {
          const lastIndex = queue.length - 1;
          const track = queue[lastIndex]?.track;
          if (track) {
            set({
              currentTrack: track,
              queueIndex: lastIndex,
              currentTime: 0,
              duration: track.duration || 0,
              isPlaying: true,
            });
          }
          return;
        }

        const prevTrack = queue[prevIndex]?.track;
        if (prevTrack) {
          set({
            currentTrack: prevTrack,
            queueIndex: prevIndex,
            currentTime: 0,
            duration: prevTrack.duration || 0,
            isPlaying: true,
          });
        }
      },

      seek: (time: number) => {
        set({ currentTime: Math.max(0, Math.min(time, get().duration)) });
      },

      setCurrentTime: (time: number) => {
        set({ currentTime: time });
      },

      setDuration: (duration: number) => {
        set({ duration });
      },

      setVolume: (volume: number) => {
        set({ volume: Math.max(0, Math.min(1, volume)), muted: false });
      },

      toggleMute: () => {
        set((state) => ({ muted: !state.muted }));
      },

      toggleShuffle: () => {
        const { shuffle, queue, queueIndex } = get();
        const newShuffle = !shuffle;

        if (newShuffle && queue.length > 1) {
          const currentTrack = queue[queueIndex];
          const otherItems = queue.filter((_, i) => i !== queueIndex);
          const shuffled = [...otherItems].sort(() => Math.random() - 0.5);
          const newQueue = currentTrack ? [currentTrack, ...shuffled] : shuffled;

          set({
            shuffle: newShuffle,
            queue: newQueue,
            queueIndex: 0,
          });
        } else {
          set({ shuffle: newShuffle });
        }
      },

      toggleRepeat: () => {
        const { repeat } = get();
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const currentIndex = modes.indexOf(repeat);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        set({ repeat: nextMode });
      },

      addToQueue: (track: Track, source?: string) => {
        const { queue } = get();
        const queueItem: QueueItem = {
          track,
          addedAt: Date.now(),
          source,
        };
        set({ queue: [...queue, queueItem] });
      },

      addNext: (track: Track, source?: string) => {
        const { queue, queueIndex } = get();
        const queueItem: QueueItem = {
          track,
          addedAt: Date.now(),
          source,
        };
        const newQueue = [...queue];
        newQueue.splice(queueIndex + 1, 0, queueItem);
        set({ queue: newQueue });
      },

      removeFromQueue: (index: number) => {
        const { queue, queueIndex } = get();
        if (index === queueIndex) return;
        const newQueue = queue.filter((_, i) => i !== index);
        const newIndex = index < queueIndex ? queueIndex - 1 : queueIndex;
        set({ queue: newQueue, queueIndex: newIndex });
      },

      clearQueue: () => {
        const { currentTrack, queueIndex } = get();
        if (currentTrack) {
          const currentQueueItem = queue[queueIndex];
          set({
            queue: currentQueueItem ? [currentQueueItem] : [],
            queueIndex: 0,
          });
        } else {
          set({ queue: [], queueIndex: -1 });
        }
      },

      setSleepTimer: (minutes: number | null) => {
        if (minutes === null) {
          set({ sleepTimer: null, sleepTimerEnd: null });
        } else {
          set({
            sleepTimer: minutes,
            sleepTimerEnd: Date.now() + minutes * 60 * 1000,
          });
        }
      },

      setFullPlayerOpen: (open: boolean) => {
        set({ isFullPlayerOpen: open });
      },
    }),
    {
      name: 'saavnify-player',
      storage: safeStorage,
      partialize: (state) => ({
        volume: state.volume,
        muted: state.muted,
        shuffle: state.shuffle,
        repeat: state.repeat,
        currentTrack: state.currentTrack,
        queue: state.queue,
        queueIndex: state.queueIndex,
      }),
    }
  )
);
