import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ThemeName, ThemeConfig } from '@/types';

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

// ---- Theme Presets ----

export const THEME_PRESETS: Record<ThemeName, ThemeConfig> = {
  'spotify-dark': {
    name: 'spotify-dark',
    label: 'Spotify Dark',
    background: '#090909',
    secondaryBg: '#121212',
    cardBg: '#181818',
    elevatedSurface: '#222222',
    accent: '#1DB954',
    primaryText: '#FFFFFF',
    secondaryText: '#B3B3B3',
    border: '#282828',
  },
  'amoled-black': {
    name: 'amoled-black',
    label: 'AMOLED Black',
    background: '#000000',
    secondaryBg: '#0A0A0A',
    cardBg: '#111111',
    elevatedSurface: '#1A1A1A',
    accent: '#1DB954',
    primaryText: '#FFFFFF',
    secondaryText: '#999999',
    border: '#1A1A1A',
  },
  'youtube-music': {
    name: 'youtube-music',
    label: 'YouTube Music',
    background: '#0F0F0F',
    secondaryBg: '#181818',
    cardBg: '#212121',
    elevatedSurface: '#2C2C2C',
    accent: '#FF0000',
    primaryText: '#FFFFFF',
    secondaryText: '#AAAAAA',
    border: '#303030',
  },
  light: {
    name: 'light',
    label: 'Light',
    background: '#FFFFFF',
    secondaryBg: '#F5F5F5',
    cardBg: '#EEEEEE',
    elevatedSurface: '#E0E0E0',
    accent: '#1DB954',
    primaryText: '#121212',
    secondaryText: '#666666',
    border: '#CCCCCC',
  },
  'material-you': {
    name: 'material-you',
    label: 'Material You',
    background: '#1C1B1F',
    secondaryBg: '#2B2930',
    cardBg: '#332D3E',
    elevatedSurface: '#3B3547',
    accent: '#D0BCFF',
    primaryText: '#E6E1E5',
    secondaryText: '#CAC4D0',
    border: '#49454F',
  },
};

interface ThemeStore {
  selectedTheme: ThemeName;
  accentColor: string;
  amoledMode: boolean;
  dynamicColors: boolean;
  setTheme: (theme: ThemeName) => void;
  setAccentColor: (color: string) => void;
  setAmoledMode: (enabled: boolean) => void;
  setDynamicColors: (enabled: boolean) => void;
  getCurrentTheme: () => ThemeConfig;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      selectedTheme: 'spotify-dark',
      accentColor: '#1DB954',
      amoledMode: false,
      dynamicColors: false,

      setTheme: (theme: ThemeName) => {
        const preset = THEME_PRESETS[theme];
        set({
          selectedTheme: theme,
          accentColor: preset.accent,
        });
      },

      setAccentColor: (color: string) => {
        set({ accentColor: color });
      },

      setAmoledMode: (enabled: boolean) => {
        set({ amoledMode: enabled });
      },

      setDynamicColors: (enabled: boolean) => {
        set({ dynamicColors: enabled });
      },

      getCurrentTheme: () => {
        const state = get();
        const preset = THEME_PRESETS[state.selectedTheme];

        // Override with AMOLED if enabled
        if (state.amoledMode && state.selectedTheme !== 'light') {
          return {
            ...preset,
            background: '#000000',
            secondaryBg: '#050505',
            cardBg: '#0A0A0A',
            elevatedSurface: '#141414',
            border: '#1A1A1A',
          };
        }

        // Override accent color if customized
        return {
          ...preset,
          accent: state.accentColor,
        };
      },
    }),
    {
      name: 'saavnify-theme',
      storage: safeStorage,
    }
  )
);
