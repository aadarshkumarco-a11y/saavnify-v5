import Dexie, { type Table } from 'dexie';
import type {
  Track,
  HistoryEntry,
  SearchHistoryEntry,
  Recommendation,
  AppSettings,
} from '@/types';

// ---- SAAVNIFY Database Schema ----

export class SaavnifyDB extends Dexie {
  songs!: Table<Track, string>;
  history!: Table<HistoryEntry, number>;
  searchHistory!: Table<SearchHistoryEntry, number>;
  recommendations!: Table<Recommendation, number>;
  settings!: Table<AppSettings & { id: string }, string>;

  constructor() {
    super('saavnify-db');

    this.version(1).stores({
      songs: 'id, videoId, title, artist, addedAt',
      history: '++id, songId, playedAt',
      searchHistory: '++id, query, searchedAt',
      recommendations: '++id, trackId, score, createdAt',
      settings: 'id',
    });
  }
}

// Lazy-initialize the database to prevent crashes in Android WebView
// where IndexedDB might not be available immediately on startup
let _db: SaavnifyDB | null = null;

export function getDb(): SaavnifyDB {
  if (!_db) {
    try {
      _db = new SaavnifyDB();
    } catch (err) {
      console.error('Failed to initialize database:', err);
      throw err;
    }
  }
  return _db;
}

// For backward compatibility - all db.xxx accesses go through getDb()
// We use Object.defineProperty to lazily forward property access
// This avoids the Proxy pattern which can cause issues in some WebView environments
export const db: SaavnifyDB = {} as SaavnifyDB;

// Override property access to use lazy initialization
const dbTableNames = ['songs', 'history', 'searchHistory', 'recommendations', 'settings'] as const;
dbTableNames.forEach((name) => {
  Object.defineProperty(db, name, {
    get() {
      return getDb()[name];
    },
    enumerable: true,
    configurable: true,
  });
});

// ---- Song Operations ----

export async function saveSong(track: Track): Promise<string> {
  const existing = await db.songs.get(track.id);
  if (existing) {
    await db.songs.update(track.id, track);
    return track.id;
  }
  return db.songs.add(track);
}

export async function getSong(id: string): Promise<Track | undefined> {
  return db.songs.get(id);
}

export async function getSongByVideoId(videoId: string): Promise<Track | undefined> {
  return db.songs.where('videoId').equals(videoId).first();
}

export async function deleteSong(id: string): Promise<void> {
  await db.songs.delete(id);
}

export async function getAllSongs(): Promise<Track[]> {
  return db.songs.toArray();
}

export async function searchSongs(query: string): Promise<Track[]> {
  const lowerQuery = query.toLowerCase();
  return db.songs
    .filter(
      (song) =>
        song.title.toLowerCase().includes(lowerQuery) ||
        song.artist.toLowerCase().includes(lowerQuery)
    )
    .toArray();
}

// ---- History Operations ----

export async function addToHistory(track: Track, playDuration: number = 0): Promise<number> {
  await saveSong(track);
  return db.history.add({
    songId: track.id,
    track,
    playedAt: Date.now(),
    playDuration,
  });
}

export async function getHistory(limit: number = 50): Promise<HistoryEntry[]> {
  return db.history.orderBy('playedAt').reverse().limit(limit).toArray();
}

export async function clearHistory(): Promise<void> {
  await db.history.clear();
}

export async function getRecentHistory(count: number = 20): Promise<HistoryEntry[]> {
  return db.history.orderBy('playedAt').reverse().limit(count).toArray();
}

// ---- Search History Operations ----

export async function addSearchHistory(query: string): Promise<number> {
  // Remove duplicate search queries
  await db.searchHistory
    .where('query')
    .equals(query)
    .delete();

  return db.searchHistory.add({
    query,
    searchedAt: Date.now(),
  });
}

export async function getSearchHistory(limit: number = 20): Promise<SearchHistoryEntry[]> {
  return db.searchHistory.orderBy('searchedAt').reverse().limit(limit).toArray();
}

export async function clearSearchHistory(): Promise<void> {
  await db.searchHistory.clear();
}

export async function deleteSearchHistoryEntry(id: number): Promise<void> {
  await db.searchHistory.delete(id);
}

// ---- Recommendations Operations ----

export async function addRecommendation(rec: Recommendation): Promise<number> {
  return db.recommendations.add(rec);
}

export async function getRecommendations(limit: number = 20): Promise<Recommendation[]> {
  return db.recommendations.orderBy('score').reverse().limit(limit).toArray();
}

export async function clearRecommendations(): Promise<void> {
  await db.recommendations.clear();
}

// ---- Settings Operations ----

const DEFAULT_SETTINGS: AppSettings & { id: string } = {
  id: 'app-settings',
  audioQuality: 'high',
  downloadQuality: 'high',
  autoPlay: true,
  crossfade: false,
  crossfadeDuration: 3,
  gapless: true,
  normalize: true,
  showLyrics: true,
  miniPlayerStyle: 'expanded',
  language: 'en',
  dataSaver: false,
};

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get('app-settings');
  if (!settings) {
    await db.settings.add(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  const { id: _, ...rest } = settings;
  return rest;
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  const existing = await db.settings.get('app-settings');
  if (existing) {
    await db.settings.update('app-settings', settings);
  } else {
    await db.settings.add({ ...DEFAULT_SETTINGS, ...settings });
  }
}

// ---- Database Utilities ----

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.songs.clear(),
    db.history.clear(),
    db.searchHistory.clear(),
    db.recommendations.clear(),
    db.settings.clear(),
  ]);
}

export async function getDatabaseSize(): Promise<{
  songs: number;
  history: number;
  searchHistory: number;
  recommendations: number;
}> {
  const [songs, history, searchHistory, recommendations] = await Promise.all([
    db.songs.count(),
    db.history.count(),
    db.searchHistory.count(),
    db.recommendations.count(),
  ]);

  return { songs, history, searchHistory, recommendations };
}
