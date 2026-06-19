// ============================================================
// SAAVNIFY V4 - Smart Playlist Engine
// India-focused automatic playlists based on user behavior
// ============================================================

import { unifiedSearch, searchByMood } from '@/lib/music-aggregator';
import type { Track, Artist, HistoryEntry } from '@/types';

// ---- Types ----

export interface SmartPlaylist {
  id: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
  tracks: Track[];
  trackCount: number;
  autoUpdate: boolean;
  updatedAt: number;
}

/** Cache for smart playlist results */
const playlistCache = new Map<string, { data: Track[]; timestamp: number }>();
const PLAYLIST_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/** Maximum tracks per smart playlist */
const MAX_PLAYLIST_TRACKS = 30;

// ---- Smart Playlist Generators (India-focused) ----

/**
 * Daily Mix - blend of favorite artists + Bollywood + Punjabi
 */
export async function generateDailyMix(
  likedSongs: Track[],
  history: HistoryEntry[]
): Promise<Track[]> {
  try {
    const cacheKey = 'daily-mix';
    const cached = playlistCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL) {
      return cached.data;
    }

    const allTracks: Track[] = [];
    const seenVideoIds = new Set<string>();

    // Get top artists from history
    const artistCounts = new Map<string, number>();
    for (const entry of history.slice(0, 100)) {
      const artist = entry.track.artist || entry.track.channelTitle;
      artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    }

    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([name]) => name);

    // Search for top songs from favorite artists (sequential, not parallel)
    for (const artist of topArtists) {
      try {
        const result = await unifiedSearch(`${artist} top songs`, 10);
        for (const track of result.tracks) {
          if (!seenVideoIds.has(track.videoId)) {
            seenVideoIds.add(track.videoId);
            allTracks.push(track);
          }
        }
      } catch {
        // Continue
      }
    }

    // Add some Bollywood hits
    try {
      const bollywood = await unifiedSearch('bollywood hits 2025', 8);
      for (const track of bollywood.tracks) {
        if (!seenVideoIds.has(track.videoId)) {
          seenVideoIds.add(track.videoId);
          allTracks.push(track);
        }
      }
    } catch {
      // Continue
    }

    // Add liked songs
    const likedShuffled = shuffleArray([...likedSongs]).slice(0, 5);
    for (const track of likedShuffled) {
      if (!seenVideoIds.has(track.videoId)) {
        seenVideoIds.add(track.videoId);
        allTracks.unshift(track); // Put liked songs first
      }
    }

    const result = shuffleArray(allTracks).slice(0, MAX_PLAYLIST_TRACKS);
    playlistCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Failed to generate daily mix:', error);
    return shuffleArray([...likedSongs]).slice(0, MAX_PLAYLIST_TRACKS);
  }
}

/**
 * Workout Mix - Indian workout music
 */
export async function generateWorkoutMix(
  history: HistoryEntry[],
  favoriteGenres: string[] = []
): Promise<Track[]> {
  try {
    const cacheKey = 'workout-mix';
    const cached = playlistCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL) {
      return cached.data;
    }

    const queries = [
      'workout music hindi punjabi',
      'gym songs bollywood',
      'high energy workout mix india',
    ];

    if (history.length > 0) {
      const topArtist = getTopArtistFromHistory(history);
      if (topArtist) {
        queries.push(`${topArtist} workout remix`);
      }
    }

    const tracks = await searchAndCombine(queries);
    const result = tracks.slice(0, MAX_PLAYLIST_TRACKS);

    playlistCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Failed to generate workout mix:', error);
    return [];
  }
}

/**
 * Study Mix - Indian lo-fi and ambient
 */
export async function generateStudyMix(
  history: HistoryEntry[],
  favoriteGenres: string[] = []
): Promise<Track[]> {
  try {
    const cacheKey = 'study-mix';
    const cached = playlistCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL) {
      return cached.data;
    }

    const queries = [
      'lofi india study music',
      'focus music hindi',
      'lo-fi study beats india',
    ];

    if (history.length > 0) {
      const topArtist = getTopArtistFromHistory(history);
      if (topArtist) {
        queries.push(`${topArtist} chill mix`);
      }
    }

    const tracks = await searchAndCombine(queries);
    const result = tracks.slice(0, MAX_PLAYLIST_TRACKS);

    playlistCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Failed to generate study mix:', error);
    return [];
  }
}

/**
 * Night Mix - relaxing Indian music
 */
export async function generateNightMix(
  history: HistoryEntry[]
): Promise<Track[]> {
  try {
    const cacheKey = 'night-mix';
    const cached = playlistCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL) {
      return cached.data;
    }

    const queries = [
      'relaxing hindi songs',
      'night vibes playlist india',
      'calm music hindi for sleeping',
    ];

    if (history.length > 0) {
      const topArtist = getTopArtistFromHistory(history);
      if (topArtist) {
        queries.push(`${topArtist} relaxing songs`);
      }
    }

    const tracks = await searchAndCombine(queries);
    const result = tracks.slice(0, MAX_PLAYLIST_TRACKS);

    playlistCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Failed to generate night mix:', error);
    return [];
  }
}

/**
 * Focus Mix - Indian instrumental / concentration
 */
export async function generateFocusMix(
  history: HistoryEntry[]
): Promise<Track[]> {
  try {
    const cacheKey = 'focus-mix';
    const cached = playlistCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL) {
      return cached.data;
    }

    const queries = [
      'indian instrumental focus music',
      'concentration music hindi no lyrics',
      'meditation music india',
    ];

    const tracks = await searchAndCombine(queries);
    const result = tracks.slice(0, MAX_PLAYLIST_TRACKS);

    playlistCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Failed to generate focus mix:', error);
    return [];
  }
}

/**
 * Romantic Mix - Hindi romantic songs
 */
export async function generateRomanticMix(
  history: HistoryEntry[]
): Promise<Track[]> {
  try {
    const cacheKey = 'romantic-mix';
    const cached = playlistCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL) {
      return cached.data;
    }

    const queries = [
      'romantic songs hindi playlist',
      'love songs bollywood',
      'best romantic hindi songs',
    ];

    if (history.length > 0) {
      const topArtist = getTopArtistFromHistory(history);
      if (topArtist) {
        queries.push(`${topArtist} love songs`);
      }
    }

    const tracks = await searchAndCombine(queries);
    const result = tracks.slice(0, MAX_PLAYLIST_TRACKS);

    playlistCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Failed to generate romantic mix:', error);
    return [];
  }
}

/**
 * Most Played playlist
 */
export async function generateMostPlayed(
  history: HistoryEntry[]
): Promise<Track[]> {
  try {
    const playCounts = new Map<string, { track: Track; count: number }>();

    for (const entry of history) {
      const existing = playCounts.get(entry.songId);
      if (existing) {
        existing.count += 1;
      } else {
        playCounts.set(entry.songId, { track: entry.track, count: 1 });
      }
    }

    return Array.from(playCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_PLAYLIST_TRACKS)
      .map((item) => item.track);
  } catch (error) {
    console.error('Failed to generate most played:', error);
    return [];
  }
}

/**
 * Recently Played playlist
 */
export async function generateRecentlyPlayed(
  history: HistoryEntry[]
): Promise<Track[]> {
  try {
    return history.slice(0, 50).map((entry) => entry.track);
  } catch (error) {
    console.error('Failed to generate recently played:', error);
    return [];
  }
}

/**
 * Liked Songs Mix
 */
export async function generateLikedSongsMix(
  likedSongs: Track[]
): Promise<Track[]> {
  try {
    return shuffleArray([...likedSongs]).slice(0, MAX_PLAYLIST_TRACKS);
  } catch (error) {
    console.error('Failed to generate liked songs mix:', error);
    return likedSongs.slice(0, MAX_PLAYLIST_TRACKS);
  }
}

/**
 * Get all smart playlists (India-focused)
 */
export async function getAllSmartPlaylists(
  userProfile: { favoriteArtists: Artist[]; favoriteGenres: string[] },
  likedSongs: Track[],
  history: HistoryEntry[]
): Promise<SmartPlaylist[]> {
  try {
    const now = Date.now();

    const playlistDefinitions: Array<{
      id: string;
      name: string;
      description: string;
      emoji: string;
      gradient: string;
      generator: () => Promise<Track[]>;
    }> = [
      {
        id: 'smart-daily-mix',
        name: 'Daily Mix',
        description: 'Your personalized daily soundtrack',
        emoji: '✨',
        gradient: 'from-emerald-500 to-teal-600',
        generator: () => generateDailyMix(likedSongs, history),
      },
      {
        id: 'smart-workout',
        name: 'Workout Mix',
        description: 'Bollywood & Punjabi workout bangers',
        emoji: '💪',
        gradient: 'from-orange-500 to-red-600',
        generator: () => generateWorkoutMix(history, userProfile.favoriteGenres),
      },
      {
        id: 'smart-study',
        name: 'Study Mix',
        description: 'Lo-fi India beats for focus',
        emoji: '📚',
        gradient: 'from-violet-500 to-purple-600',
        generator: () => generateStudyMix(history, userProfile.favoriteGenres),
      },
      {
        id: 'smart-night',
        name: 'Night Mix',
        description: 'Relaxing Hindi tunes for the night',
        emoji: '🌙',
        gradient: 'from-indigo-500 to-blue-600',
        generator: () => generateNightMix(history),
      },
      {
        id: 'smart-focus',
        name: 'Focus Mix',
        description: 'Indian instrumental concentration music',
        emoji: '🧘',
        gradient: 'from-cyan-500 to-sky-600',
        generator: () => generateFocusMix(history),
      },
      {
        id: 'smart-romantic',
        name: 'Romantic Mix',
        description: 'Hindi love songs and Bollywood romance',
        emoji: '💕',
        gradient: 'from-pink-500 to-rose-600',
        generator: () => generateRomanticMix(history),
      },
      {
        id: 'smart-most-played',
        name: 'Most Played',
        description: 'Your all-time most played tracks',
        emoji: '🔥',
        gradient: 'from-amber-500 to-orange-600',
        generator: () => generateMostPlayed(history),
      },
      {
        id: 'smart-recent',
        name: 'Recently Played',
        description: 'Your latest listening history',
        emoji: '🕐',
        gradient: 'from-slate-500 to-gray-600',
        generator: () => generateRecentlyPlayed(history),
      },
      {
        id: 'smart-liked-mix',
        name: 'Liked Songs Mix',
        description: 'A shuffle of your favorite tracks',
        emoji: '❤️',
        gradient: 'from-green-500 to-emerald-600',
        generator: () => generateLikedSongsMix(likedSongs),
      },
    ];

    // Generate playlists sequentially (not parallel) to reduce API calls
    const results: SmartPlaylist[] = [];

    for (const def of playlistDefinitions) {
      try {
        const tracks = await def.generator();
        if (tracks.length > 0) {
          results.push({
            id: def.id,
            name: def.name,
            description: def.description,
            emoji: def.emoji,
            gradient: def.gradient,
            tracks,
            trackCount: tracks.length,
            autoUpdate: true,
            updatedAt: now,
          });
        }
      } catch {
        // Skip failed playlists
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to get all smart playlists:', error);
    return [];
  }
}

// ---- Helper Functions ----

/**
 * Search with multiple queries sequentially (reduces API calls)
 */
async function searchAndCombine(queries: string[]): Promise<Track[]> {
  const allTracks: Track[] = [];
  const seenVideoIds = new Set<string>();

  // Sequential search - stop early if we have enough
  for (const q of queries.slice(0, 3)) {
    try {
      const tracks = await searchByMood(q);
      for (const track of tracks) {
        if (!seenVideoIds.has(track.videoId)) {
          seenVideoIds.add(track.videoId);
          allTracks.push(track);
        }
      }
      // If we have enough, stop
      if (allTracks.length >= MAX_PLAYLIST_TRACKS) break;
    } catch {
      // Continue
    }
  }

  return shuffleArray(allTracks);
}

function getTopArtistFromHistory(history: HistoryEntry[]): string | null {
  if (history.length === 0) return null;

  const artistCounts = new Map<string, number>();
  for (const entry of history.slice(0, 50)) {
    const artist = entry.track.artist || entry.track.channelTitle;
    artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
  }

  const topArtist = Array.from(artistCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  return topArtist ? topArtist[0] : null;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function clearSmartPlaylistCache(): void {
  playlistCache.clear();
}
