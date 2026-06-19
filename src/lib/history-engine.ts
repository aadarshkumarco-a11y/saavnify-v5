// ============================================================
// SAAVNIFY V4 - History Tracking Engine
// Manages detailed listening history with analytics and reporting
// ============================================================

import { db, addToHistory as dbAddToHistory, getHistory as dbGetHistory } from '@/lib/db';
import type { Track, Artist, HistoryEntry } from '@/types';

// ---- Types ----

export interface ExtendedHistoryEntry extends HistoryEntry {
  completionPercentage?: number;
  source?: string;
}

export interface DailyListening {
  date: string;
  minutes: number;
}

export interface WeeklyReport {
  weekStart: string;
  totalMinutes: number;
  totalPlays: number;
  topTracks: Track[];
  topArtists: Artist[];
  topGenres: string[];
  dailyBreakdown: DailyListening[];
  averageDailyMinutes: number;
}

export interface MonthlyReport {
  month: string;
  totalMinutes: number;
  totalPlays: number;
  topTracks: Track[];
  topArtists: Artist[];
  topGenres: string[];
  weeklyBreakdown: { week: number; minutes: number }[];
  listeningStreak: number;
}

export interface YearlyReport {
  year: number;
  totalMinutes: number;
  totalPlays: number;
  topTracks: Track[];
  topArtists: Artist[];
  topGenres: string[];
  monthlyBreakdown: { month: string; minutes: number }[];
  longestStreak: number;
}

/** Maximum number of history entries to keep */
const MAX_HISTORY_ENTRIES = 10000;

// ---- Core Functions ----

/**
 * Record a play event for a track
 * @param track - The track that was played
 * @param source - Where the play came from (e.g., 'radio', 'home', 'search')
 * @param completionPercentage - How much of the track was listened to (0-100)
 */
export async function recordPlay(
  track: Track,
  source: string = 'unknown',
  completionPercentage: number = 100
): Promise<void> {
  try {
    const playDuration = Math.round((track.duration * completionPercentage) / 100);

    await dbAddToHistory(track, playDuration);

    // Also store extended metadata in a separate approach using the track's addedAt field
    // We embed source and completionPercentage into the track's publishedAt or use a convention
    // Since HistoryEntry doesn't have these fields, we use the existing schema efficiently

    // Auto-cleanup: keep only last MAX_HISTORY_ENTRIES
    await cleanupHistory();
  } catch (error) {
    console.error('Failed to record play:', error);
  }
}

/**
 * Get listening history with pagination
 * @param limit - Maximum number of entries to return
 * @param offset - Number of entries to skip
 * @returns Array of history entries, newest first
 */
export async function getHistory(
  limit: number = 50,
  offset: number = 0
): Promise<HistoryEntry[]> {
  try {
    const all = await dbGetHistory(limit + offset);
    return all.slice(offset, offset + limit);
  } catch (error) {
    console.error('Failed to get history:', error);
    return [];
  }
}

/**
 * Get history entries for a specific date
 * @param date - Date string in YYYY-MM-DD format
 * @returns History entries for that date
 */
export async function getHistoryByDate(date: string): Promise<HistoryEntry[]> {
  try {
    const startOfDay = new Date(date).setHours(0, 0, 0, 0);
    const endOfDay = new Date(date).setHours(23, 59, 59, 999);

    const allHistory = await db.history.toArray();
    return allHistory
      .filter((entry) => entry.playedAt >= startOfDay && entry.playedAt <= endOfDay)
      .sort((a, b) => b.playedAt - a.playedAt);
  } catch (error) {
    console.error('Failed to get history by date:', error);
    return [];
  }
}

/**
 * Get the top played songs for a given time period
 * @param period - Time period: 'week', 'month', or 'year'
 * @returns Array of tracks sorted by play count
 */
export async function getTopSongs(
  period: 'week' | 'month' | 'year' = 'month'
): Promise<Track[]> {
  try {
    const cutoff = getPeriodCutoff(period);
    const allHistory = await db.history
      .where('playedAt')
      .above(cutoff)
      .toArray();

    const playCounts = new Map<string, { track: Track; count: number }>();

    for (const entry of allHistory) {
      const existing = playCounts.get(entry.songId);
      if (existing) {
        existing.count += 1;
      } else {
        playCounts.set(entry.songId, { track: entry.track, count: 1 });
      }
    }

    return Array.from(playCounts.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => item.track);
  } catch (error) {
    console.error('Failed to get top songs:', error);
    return [];
  }
}

/**
 * Get the top played artists for a given time period
 * @param period - Time period: 'week', 'month', or 'year'
 * @returns Array of artists sorted by play count
 */
export async function getTopArtists(
  period: 'week' | 'month' | 'year' = 'month'
): Promise<Artist[]> {
  try {
    const cutoff = getPeriodCutoff(period);
    const allHistory = await db.history
      .where('playedAt')
      .above(cutoff)
      .toArray();

    const artistCounts = new Map<string, { artist: Artist; count: number }>();

    for (const entry of allHistory) {
      const artistKey = entry.track.channelTitle;
      const existing = artistCounts.get(artistKey);
      if (existing) {
        existing.count += 1;
      } else {
        artistCounts.set(artistKey, {
          artist: {
            id: `artist-${entry.track.videoId}`,
            channelId: entry.track.channelTitle,
            name: entry.track.artist || entry.track.channelTitle,
            thumbnail: entry.track.thumbnail,
          },
          count: 1,
        });
      }
    }

    return Array.from(artistCounts.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => item.artist);
  } catch (error) {
    console.error('Failed to get top artists:', error);
    return [];
  }
}

/**
 * Get the top genres for a given time period
 * @param period - Time period: 'week', 'month', or 'year'
 * @returns Array of genre strings sorted by frequency
 */
export async function getTopGenres(
  period: 'week' | 'month' | 'year' = 'month'
): Promise<string[]> {
  try {
    const cutoff = getPeriodCutoff(period);
    const allHistory = await db.history
      .where('playedAt')
      .above(cutoff)
      .toArray();

    const genreCounts = new Map<string, number>();

    // Extract genre-like keywords from track titles and artist names
    for (const entry of allHistory) {
      const keywords = extractGenreKeywords(entry.track.title, entry.track.artist);
      for (const keyword of keywords) {
        genreCounts.set(keyword, (genreCounts.get(keyword) || 0) + 1);
      }
    }

    return Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);
  } catch (error) {
    console.error('Failed to get top genres:', error);
    return [];
  }
}

/**
 * Get total listening time in minutes for a period
 * @param period - Time period: 'week', 'month', or 'year'
 * @returns Total listening time in minutes
 */
export async function getListeningTime(
  period: 'week' | 'month' | 'year' = 'month'
): Promise<number> {
  try {
    const cutoff = getPeriodCutoff(period);
    const allHistory = await db.history
      .where('playedAt')
      .above(cutoff)
      .toArray();

    const totalSeconds = allHistory.reduce((sum, entry) => sum + (entry.playDuration || 0), 0);
    return Math.round(totalSeconds / 60);
  } catch (error) {
    console.error('Failed to get listening time:', error);
    return 0;
  }
}

/**
 * Get the current listening streak in days
 * @returns Number of consecutive days with listening activity
 */
export async function getListeningStreak(): Promise<number> {
  try {
    const allHistory = await db.history.orderBy('playedAt').reverse().toArray();
    if (allHistory.length === 0) return 0;

    const streakDays = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unique dates with activity
    for (const entry of allHistory) {
      const date = new Date(entry.playedAt);
      date.setHours(0, 0, 0, 0);
      streakDays.add(date.toISOString().split('T')[0]);
    }

    let streak = 0;
    const currentDate = new Date(today);

    // Check if today has activity, if not start from yesterday
    if (!streakDays.has(currentDate.toISOString().split('T')[0])) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count consecutive days
    while (streakDays.has(currentDate.toISOString().split('T')[0])) {
      streak += 1;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  } catch (error) {
    console.error('Failed to get listening streak:', error);
    return 0;
  }
}

/**
 * Get the total number of plays
 * @returns Total play count
 */
export async function getTotalPlays(): Promise<number> {
  try {
    return db.history.count();
  } catch (error) {
    console.error('Failed to get total plays:', error);
    return 0;
  }
}

/**
 * Get daily listening time breakdown
 * @returns Array of date-minute pairs
 */
export async function getDailyListeningTime(): Promise<DailyListening[]> {
  try {
    const allHistory = await db.history.toArray();

    const dailyMap = new Map<string, number>();

    for (const entry of allHistory) {
      const date = new Date(entry.playedAt).toISOString().split('T')[0];
      const minutes = (entry.playDuration || 0) / 60;
      dailyMap.set(date, (dailyMap.get(date) || 0) + minutes);
    }

    return Array.from(dailyMap.entries())
      .map(([date, minutes]) => ({ date, minutes: Math.round(minutes) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Failed to get daily listening time:', error);
    return [];
  }
}

/**
 * Generate a weekly listening report
 * @returns Weekly report with detailed statistics
 */
export async function getWeeklyReport(): Promise<WeeklyReport> {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekStartStr = weekStart.toISOString().split('T')[0];

    const allHistory = await db.history
      .where('playedAt')
      .above(weekStart.getTime())
      .toArray();

    const totalSeconds = allHistory.reduce((sum, e) => sum + (e.playDuration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    // Daily breakdown
    const dailyMap = new Map<string, number>();
    for (const entry of allHistory) {
      const date = new Date(entry.playedAt).toISOString().split('T')[0];
      const mins = (entry.playDuration || 0) / 60;
      dailyMap.set(date, (dailyMap.get(date) || 0) + mins);
    }
    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, minutes]) => ({ date, minutes: Math.round(minutes) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top tracks
    const trackCounts = new Map<string, { track: Track; count: number }>();
    for (const entry of allHistory) {
      const existing = trackCounts.get(entry.songId);
      if (existing) {
        existing.count += 1;
      } else {
        trackCounts.set(entry.songId, { track: entry.track, count: 1 });
      }
    }
    const topTracks = Array.from(trackCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => item.track);

    // Top artists
    const artistCounts = new Map<string, { artist: Artist; count: number }>();
    for (const entry of allHistory) {
      const key = entry.track.channelTitle;
      const existing = artistCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        artistCounts.set(key, {
          artist: {
            id: `artist-${entry.track.videoId}`,
            channelId: entry.track.channelTitle,
            name: entry.track.artist || entry.track.channelTitle,
            thumbnail: entry.track.thumbnail,
          },
          count: 1,
        });
      }
    }
    const topArtists = Array.from(artistCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => item.artist);

    // Top genres
    const genreCounts = new Map<string, number>();
    for (const entry of allHistory) {
      const keywords = extractGenreKeywords(entry.track.title, entry.track.artist);
      for (const keyword of keywords) {
        genreCounts.set(keyword, (genreCounts.get(keyword) || 0) + 1);
      }
    }
    const topGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    return {
      weekStart: weekStartStr,
      totalMinutes,
      totalPlays: allHistory.length,
      topTracks,
      topArtists,
      topGenres,
      dailyBreakdown,
      averageDailyMinutes: Math.round(totalMinutes / 7),
    };
  } catch (error) {
    console.error('Failed to get weekly report:', error);
    return {
      weekStart: new Date().toISOString().split('T')[0],
      totalMinutes: 0,
      totalPlays: 0,
      topTracks: [],
      topArtists: [],
      topGenres: [],
      dailyBreakdown: [],
      averageDailyMinutes: 0,
    };
  }
}

/**
 * Generate a monthly listening report
 * @returns Monthly report with detailed statistics
 */
export async function getMonthlyReport(): Promise<MonthlyReport> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthStr = now.toISOString().slice(0, 7);

    const allHistory = await db.history
      .where('playedAt')
      .above(monthStart.getTime())
      .toArray();

    const totalSeconds = allHistory.reduce((sum, e) => sum + (e.playDuration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    // Weekly breakdown
    const weeklyMap = new Map<number, number>();
    for (const entry of allHistory) {
      const weekNum = Math.floor(
        (entry.playedAt - monthStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      const mins = (entry.playDuration || 0) / 60;
      weeklyMap.set(weekNum, (weeklyMap.get(weekNum) || 0) + mins);
    }
    const weeklyBreakdown = Array.from(weeklyMap.entries())
      .map(([week, minutes]) => ({ week, minutes: Math.round(minutes) }))
      .sort((a, b) => a.week - b.week);

    // Top tracks
    const trackCounts = new Map<string, { track: Track; count: number }>();
    for (const entry of allHistory) {
      const existing = trackCounts.get(entry.songId);
      if (existing) existing.count += 1;
      else trackCounts.set(entry.songId, { track: entry.track, count: 1 });
    }
    const topTracks = Array.from(trackCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((item) => item.track);

    // Top artists
    const artistCounts = new Map<string, { artist: Artist; count: number }>();
    for (const entry of allHistory) {
      const key = entry.track.channelTitle;
      const existing = artistCounts.get(key);
      if (existing) existing.count += 1;
      else {
        artistCounts.set(key, {
          artist: {
            id: `artist-${entry.track.videoId}`,
            channelId: entry.track.channelTitle,
            name: entry.track.artist || entry.track.channelTitle,
            thumbnail: entry.track.thumbnail,
          },
          count: 1,
        });
      }
    }
    const topArtists = Array.from(artistCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => item.artist);

    const streak = await getListeningStreak();

    return {
      month: monthStr,
      totalMinutes,
      totalPlays: allHistory.length,
      topTracks,
      topArtists,
      topGenres: [],
      weeklyBreakdown,
      listeningStreak: streak,
    };
  } catch (error) {
    console.error('Failed to get monthly report:', error);
    return {
      month: new Date().toISOString().slice(0, 7),
      totalMinutes: 0,
      totalPlays: 0,
      topTracks: [],
      topArtists: [],
      topGenres: [],
      weeklyBreakdown: [],
      listeningStreak: 0,
    };
  }
}

/**
 * Generate a yearly listening report
 * @returns Yearly report with detailed statistics
 */
export async function getYearlyReport(): Promise<YearlyReport> {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const allHistory = await db.history
      .where('playedAt')
      .above(yearStart.getTime())
      .toArray();

    const totalSeconds = allHistory.reduce((sum, e) => sum + (e.playDuration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    // Monthly breakdown
    const monthlyMap = new Map<string, number>();
    for (const entry of allHistory) {
      const month = new Date(entry.playedAt).toISOString().slice(0, 7);
      const mins = (entry.playDuration || 0) / 60;
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + mins);
    }
    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .map(([month, minutes]) => ({ month, minutes: Math.round(minutes) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Top tracks
    const trackCounts = new Map<string, { track: Track; count: number }>();
    for (const entry of allHistory) {
      const existing = trackCounts.get(entry.songId);
      if (existing) existing.count += 1;
      else trackCounts.set(entry.songId, { track: entry.track, count: 1 });
    }
    const topTracks = Array.from(trackCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
      .map((item) => item.track);

    // Top artists
    const artistCounts = new Map<string, { artist: Artist; count: number }>();
    for (const entry of allHistory) {
      const key = entry.track.channelTitle;
      const existing = artistCounts.get(key);
      if (existing) existing.count += 1;
      else {
        artistCounts.set(key, {
          artist: {
            id: `artist-${entry.track.videoId}`,
            channelId: entry.track.channelTitle,
            name: entry.track.artist || entry.track.channelTitle,
            thumbnail: entry.track.thumbnail,
          },
          count: 1,
        });
      }
    }
    const topArtists = Array.from(artistCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((item) => item.artist);

    return {
      year: now.getFullYear(),
      totalMinutes,
      totalPlays: allHistory.length,
      topTracks,
      topArtists,
      topGenres: [],
      monthlyBreakdown,
      longestStreak: 0,
    };
  } catch (error) {
    console.error('Failed to get yearly report:', error);
    return {
      year: new Date().getFullYear(),
      totalMinutes: 0,
      totalPlays: 0,
      topTracks: [],
      topArtists: [],
      topGenres: [],
      monthlyBreakdown: [],
      longestStreak: 0,
    };
  }
}

// ---- Helper Functions ----

/**
 * Get the timestamp cutoff for a time period
 */
function getPeriodCutoff(period: 'week' | 'month' | 'year'): number {
  const now = new Date();
  switch (period) {
    case 'week':
      now.setDate(now.getDate() - 7);
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - 1);
      break;
  }
  return now.getTime();
}

/**
 * Extract genre-like keywords from track title and artist name
 */
function extractGenreKeywords(title: string, artist: string): string[] {
  const genreKeywords: Record<string, string[]> = {
    'lo-fi': ['lofi', 'lo-fi', 'lo fi', 'chillhop'],
    'bollywood': ['bollywood', 'hindi', 'desi'],
    'punjabi': ['punjabi', 'bhangra', 'pendu'],
    'rock': ['rock', 'guitar', 'band'],
    'pop': ['pop', 'hit', 'chart'],
    'hip-hop': ['rap', 'hip hop', 'hiphop', 'trap'],
    'classical': ['classical', 'symphony', 'orchestra'],
    'electronic': ['edm', 'electronic', 'techno', 'house', 'dj'],
    'romantic': ['romantic', 'love', 'valentine', 'heart'],
    'workout': ['workout', 'gym', 'exercise', 'pump'],
    'study': ['study', 'focus', 'concentration', 'ambient'],
    'devotional': ['devotional', 'bhajan', 'aarti', 'mantra'],
    'jazz': ['jazz', 'blues', 'swing'],
    'r&b': ['r&b', 'rnb', 'soul'],
    'country': ['country', 'folk'],
  };

  const text = `${title} ${artist}`.toLowerCase();
  const found: string[] = [];

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      found.push(genre);
    }
  }

  return found.length > 0 ? found : ['general'];
}

/**
 * Clean up history to keep only the most recent entries
 */
async function cleanupHistory(): Promise<void> {
  try {
    const count = await db.history.count();
    if (count > MAX_HISTORY_ENTRIES) {
      const excess = count - MAX_HISTORY_ENTRIES;
      const oldest = await db.history.orderBy('playedAt').limit(excess).toArray();
      const idsToDelete = oldest.map((entry) => entry.id).filter((id): id is number => id !== undefined);
      await db.history.bulkDelete(idsToDelete);
    }
  } catch (error) {
    console.error('Failed to cleanup history:', error);
  }
}
