import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile, Artist, Achievement, UserStats } from '@/types';

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

const DEFAULT_PROFILE: UserProfile = {
  name: 'Music Lover',
  avatar: '',
  bio: 'Discovering new music every day 🎵',
  joinedAt: Date.now(),
};

const DEFAULT_STATS: UserStats = {
  totalListeningTime: 0,
  totalTracksPlayed: 0,
  topArtists: [],
  topGenres: [],
  weeklyListeningTime: 0,
};

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-play',
    title: 'First Play',
    description: 'Play your first song',
    icon: '🎵',
    progress: 0,
  },
  {
    id: 'ten-songs',
    title: 'Getting Started',
    description: 'Play 10 songs',
    icon: '🎶',
    progress: 0,
  },
  {
    id: 'hundred-songs',
    title: 'Music Enthusiast',
    description: 'Play 100 songs',
    icon: '🎧',
    progress: 0,
  },
  {
    id: 'first-like',
    title: 'Like at First Sight',
    description: 'Like your first song',
    icon: '❤️',
    progress: 0,
  },
  {
    id: 'fifty-likes',
    title: 'Curator',
    description: 'Like 50 songs',
    icon: '💜',
    progress: 0,
  },
  {
    id: 'first-playlist',
    title: 'DJ in the Making',
    description: 'Create your first playlist',
    icon: '📋',
    progress: 0,
  },
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Search for 25 different terms',
    icon: '🔍',
    progress: 0,
  },
  {
    id: 'marathon',
    title: 'Marathon Listener',
    description: 'Listen for 5 hours total',
    icon: '🏃',
    progress: 0,
  },
];

interface UserStore {
  profile: UserProfile;
  favoriteArtists: Artist[];
  favoriteGenres: string[];
  achievements: Achievement[];
  stats: UserStats;

  // Actions
  updateProfile: (updates: Partial<UserProfile>) => void;
  addFavoriteArtist: (artist: Artist) => void;
  removeFavoriteArtist: (channelId: string) => void;
  addFavoriteGenre: (genre: string) => void;
  removeFavoriteGenre: (genre: string) => void;
  incrementTracksPlayed: () => void;
  addListeningTime: (minutes: number) => void;
  unlockAchievement: (id: string) => void;
  updateAchievementProgress: (id: string, progress: number) => void;
  getAchievement: (id: string) => Achievement | undefined;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      favoriteArtists: [],
      favoriteGenres: [],
      achievements: DEFAULT_ACHIEVEMENTS,
      stats: DEFAULT_STATS,

      updateProfile: (updates: Partial<UserProfile>) => {
        set({ profile: { ...get().profile, ...updates } });
      },

      addFavoriteArtist: (artist: Artist) => {
        const { favoriteArtists } = get();
        if (!favoriteArtists.some((a) => a.channelId === artist.channelId)) {
          set({ favoriteArtists: [...favoriteArtists, { ...artist, isFavorite: true }] });
        }
      },

      removeFavoriteArtist: (channelId: string) => {
        set({
          favoriteArtists: get().favoriteArtists.filter(
            (a) => a.channelId !== channelId
          ),
        });
      },

      addFavoriteGenre: (genre: string) => {
        const { favoriteGenres } = get();
        if (!favoriteGenres.includes(genre)) {
          set({ favoriteGenres: [...favoriteGenres, genre] });
        }
      },

      removeFavoriteGenre: (genre: string) => {
        set({
          favoriteGenres: get().favoriteGenres.filter((g) => g !== genre),
        });
      },

      incrementTracksPlayed: () => {
        const { stats, achievements } = get();
        const newTotal = stats.totalTracksPlayed + 1;

        // Update stats
        const updatedStats = { ...stats, totalTracksPlayed: newTotal };

        // Update achievement progress
        const updatedAchievements = achievements.map((a) => {
          if (a.id === 'first-play') return { ...a, progress: Math.min(100, (newTotal / 1) * 100) };
          if (a.id === 'ten-songs') return { ...a, progress: Math.min(100, (newTotal / 10) * 100) };
          if (a.id === 'hundred-songs') return { ...a, progress: Math.min(100, (newTotal / 100) * 100) };
          return a;
        });

        // Auto-unlock achievements
        if (newTotal >= 1) {
          const idx = updatedAchievements.findIndex((a) => a.id === 'first-play');
          if (idx !== -1 && !updatedAchievements[idx].unlockedAt) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlockedAt: Date.now(), progress: 100 };
          }
        }
        if (newTotal >= 10) {
          const idx = updatedAchievements.findIndex((a) => a.id === 'ten-songs');
          if (idx !== -1 && !updatedAchievements[idx].unlockedAt) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlockedAt: Date.now(), progress: 100 };
          }
        }
        if (newTotal >= 100) {
          const idx = updatedAchievements.findIndex((a) => a.id === 'hundred-songs');
          if (idx !== -1 && !updatedAchievements[idx].unlockedAt) {
            updatedAchievements[idx] = { ...updatedAchievements[idx], unlockedAt: Date.now(), progress: 100 };
          }
        }

        set({ stats: updatedStats, achievements: updatedAchievements });
      },

      addListeningTime: (minutes: number) => {
        const { stats } = get();
        set({
          stats: {
            ...stats,
            totalListeningTime: stats.totalListeningTime + minutes,
            weeklyListeningTime: stats.weeklyListeningTime + minutes,
          },
        });

        // Check marathon achievement (5 hours = 300 minutes)
        const totalMinutes = stats.totalListeningTime + minutes;
        if (totalMinutes >= 300) {
          get().unlockAchievement('marathon');
        }
      },

      unlockAchievement: (id: string) => {
        const { achievements } = get();
        set({
          achievements: achievements.map((a) =>
            a.id === id && !a.unlockedAt
              ? { ...a, unlockedAt: Date.now(), progress: 100 }
              : a
          ),
        });
      },

      updateAchievementProgress: (id: string, progress: number) => {
        const { achievements } = get();
        set({
          achievements: achievements.map((a) =>
            a.id === id ? { ...a, progress: Math.min(100, Math.max(a.progress, progress)) } : a
          ),
        });
      },

      getAchievement: (id: string) => {
        return get().achievements.find((a) => a.id === id);
      },
    }),
    {
      name: 'saavnify-user',
      storage: safeStorage,
    }
  )
);
