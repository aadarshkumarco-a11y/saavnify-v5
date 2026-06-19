import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings, PlayerStyle, HomeStyle, LibraryStyle, MiniPlayerStyle, SliderStyle, AudioQuality, LibraryViewType } from '@/types';

const safeStorage = createJSONStorage(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {}
  const store = new Map<string, string>();
  return {
    getItem: (name: string) => store.get(name) ?? null,
    setItem: (name: string, value: string) => { store.set(name, value); },
    removeItem: (name: string) => { store.delete(name); },
  };
});

const DEFAULTS: AppSettings = {
  playerStyle: 'classic',
  homeStyle: 'classic',
  libraryStyle: 'classic',
  miniPlayerStyle: 'classic',
  sliderStyle: 'default',
  audioQuality: 'auto',
  libraryView: 'list',
  persistentQueue: true,
  skipSilence: false,
  audioNormalization: true,
  autoLoadMore: true,
  autoSkipOnError: false,
  stopMusicOnTaskClear: false,
  showLikeButton: true,
  showDownloadButton: true,
  lyricsProvider: 'auto',
  dynamicColors: false,
  language: 'en',
};

interface SettingsStore extends AppSettings {
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  reset: () => void;
  setPlayerStyle: (s: PlayerStyle) => void;
  setHomeStyle: (s: HomeStyle) => void;
  setLibraryStyle: (s: LibraryStyle) => void;
  setMiniPlayerStyle: (s: MiniPlayerStyle) => void;
  setSliderStyle: (s: SliderStyle) => void;
  setAudioQuality: (q: AudioQuality) => void;
  setLibraryView: (v: LibraryViewType) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<AppSettings>),
      reset: () => set({ ...DEFAULTS }),
      setPlayerStyle: (s) => set({ playerStyle: s }),
      setHomeStyle: (s) => set({ homeStyle: s }),
      setLibraryStyle: (s) => set({ libraryStyle: s }),
      setMiniPlayerStyle: (s) => set({ miniPlayerStyle: s }),
      setSliderStyle: (s) => set({ sliderStyle: s }),
      setAudioQuality: (q) => set({ audioQuality: q }),
      setLibraryView: (v) => set({ libraryView: v }),
    }),
    {
      name: 'saavnify-settings',
      storage: safeStorage,
    }
  )
);

// Option lists for settings UI
export const PLAYER_STYLE_OPTIONS: { value: PlayerStyle; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic', description: 'Default player with album art + controls' },
  { value: 'modern', label: 'Modern', description: 'Sleek dark with neon accents' },
  { value: 'spotify', label: 'Spotify', description: 'Spotify-inspired clean layout' },
  { value: 'liquid', label: 'Liquid', description: 'Fluid gradient backgrounds' },
  { value: 'cloudglow', label: 'Cloud Glow', description: 'Soft glowing cloud ambiance' },
  { value: 'frost', label: 'Frost', description: 'Frosted glass with blur' },
  { value: 'fold', label: 'Fold', description: 'Folded card with depth' },
  { value: 'groove', label: 'Groove', description: 'Circular vinyl record style' },
  { value: 'popsy', label: 'Popsy', description: 'Colorful pop with playful shapes' },
  { value: 'minimal', label: 'Minimal', description: 'Ultra-minimalist layout' },
  { value: 'paper', label: 'Paper', description: 'Flat paper-style design' },
];

export const HOME_STYLE_OPTIONS: { value: HomeStyle; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic', description: 'Current home layout' },
  { value: 'playful', label: 'Playful', description: 'Rounded cards, vibrant colors' },
  { value: 'neon', label: 'Neon', description: 'Dark with glowing neon accents' },
  { value: 'spotify', label: 'Spotify', description: 'Spotify-style home feed' },
];

export const LIBRARY_STYLE_OPTIONS: { value: LibraryStyle; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic', description: 'Current library layout' },
  { value: 'playful', label: 'Playful', description: 'Rounded, colorful grid' },
  { value: 'neon', label: 'Neon', description: 'Dark neon glow style' },
];

export const MINI_PLAYER_OPTIONS: { value: MiniPlayerStyle; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'neon', label: 'Neon' },
];

export const SLIDER_OPTIONS: { value: SliderStyle; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'squiggly', label: 'Squiggly' },
];

export const AUDIO_QUALITY_OPTIONS: { value: AudioQuality; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low (saves data)' },
];
