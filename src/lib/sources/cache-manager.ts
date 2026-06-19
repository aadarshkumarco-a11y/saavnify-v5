// ============================================================
// SAAVNIFY V4 - Cache Manager
// Aggressive local caching for offline-first experience
// Users should NEVER see empty screens
// ============================================================

import { db, saveSong, getAllSongs, searchSongs as dbSearchSongs } from '@/lib/db';
import type { Track, Artist, Album, SearchResult, SourceType } from '@/types';

// ---- Cache Entry Types ----

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // Time-to-live in ms
  source: SourceType;
}

// ---- Cache Configuration ----

const CACHE_CONFIG = {
  // Search results: 24 hours (reduces API calls significantly)
  search: 24 * 60 * 60 * 1000,
  // Trending content: 24 hours (Indian content doesn't change hourly)
  trending: 24 * 60 * 60 * 1000,
  // Recommendations: 12 hours (balance freshness with API usage)
  recommendations: 12 * 60 * 60 * 1000,
  // Home feed: 24 hours (major API call reduction)
  homeFeed: 24 * 60 * 60 * 1000,
  // Artist data: 7 days (artist info rarely changes)
  artist: 7 * 24 * 60 * 60 * 1000,
  // Album/playlist: 24 hours
  album: 24 * 60 * 60 * 1000,
  // Artwork cache: 30 days (images never change)
  artwork: 30 * 24 * 60 * 60 * 1000,
  // YouTube responses: 30 days (to preserve quota)
  youtube: 30 * 24 * 60 * 60 * 1000,
};

// ---- In-Memory Cache ----

const memoryCache = new Map<string, CacheEntry<unknown>>();

// ---- Cache Key Generators ----

function searchKey(query: string): string {
  return `search:${query.toLowerCase().trim()}`;
}

function trendingKey(): string {
  return 'trending:global';
}

function categoryKey(category: string): string {
  return `category:${category.toLowerCase()}`;
}

function homeFeedKey(): string {
  // Cache per day
  const today = new Date().toISOString().split('T')[0];
  return `home-feed:${today}`;
}

function recommendationKey(seed: string): string {
  return `rec:${seed}`;
}

// ---- Core Cache Functions ----

function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInMemory<T>(key: string, data: T, ttl: number, source: SourceType = 'cache'): void {
  memoryCache.set(key, {
    key,
    data,
    timestamp: Date.now(),
    ttl,
    source,
  });

  // Limit memory cache size
  if (memoryCache.size > 500) {
    // Remove oldest entries
    const entries = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 100 && i < entries.length; i++) {
      memoryCache.delete(entries[i][0]);
    }
  }
}

// ---- IndexedDB Persistent Cache ----

async function getFromDB<T>(key: string): Promise<T | null> {
  try {
    const settings = await db.settings.get(`cache:${key}`);
    if (!settings) return null;
    const entry = settings as unknown as CacheEntry<T>;
    if (Date.now() - entry.timestamp > entry.ttl) {
      await db.settings.delete(`cache:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function setInDB<T>(key: string, data: T, ttl: number, source: SourceType = 'cache'): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      source,
    };
    await db.settings.put({
      id: `cache:${key}`,
      ...entry,
    } as unknown as { id: string });
  } catch {
    // Silently fail - cache is best-effort
  }
}

// ---- Public Cache API ----

/**
 * Get cached search results. Checks memory first, then IndexedDB.
 */
export async function getCachedSearch(query: string): Promise<SearchResult | null> {
  const key = searchKey(query);
  const memResult = getFromMemory<SearchResult>(key);
  if (memResult) return memResult;

  const dbResult = await getFromDB<SearchResult>(key);
  if (dbResult) {
    // Re-populate memory cache
    setInMemory(key, dbResult, CACHE_CONFIG.search);
    return dbResult;
  }

  return null;
}

/**
 * Cache search results.
 */
export async function cacheSearchResults(query: string, results: SearchResult, source: SourceType): Promise<void> {
  const key = searchKey(query);
  setInMemory(key, results, CACHE_CONFIG.search, source);
  await setInDB(key, results, CACHE_CONFIG.search, source);

  // Also cache individual tracks to IndexedDB for offline search
  for (const track of results.tracks) {
    await saveSong(track).catch(() => {});
  }
}

/**
 * Get cached trending tracks.
 */
export async function getCachedTrending(): Promise<Track[] | null> {
  const key = trendingKey();
  const memResult = getFromMemory<Track[]>(key);
  if (memResult) return memResult;

  const dbResult = await getFromDB<Track[]>(key);
  if (dbResult) {
    setInMemory(key, dbResult, CACHE_CONFIG.trending);
    return dbResult;
  }

  return null;
}

/**
 * Cache trending tracks.
 */
export async function cacheTrending(tracks: Track[], source: SourceType): Promise<void> {
  const key = trendingKey();
  setInMemory(key, tracks, CACHE_CONFIG.trending, source);
  await setInDB(key, tracks, CACHE_CONFIG.trending, source);

  for (const track of tracks) {
    await saveSong(track).catch(() => {});
  }
}

/**
 * Get cached category tracks.
 */
export async function getCachedCategory(category: string): Promise<Track[] | null> {
  const key = categoryKey(category);
  return getFromMemory<Track[]>(key);
}

/**
 * Cache category tracks.
 */
export function cacheCategory(category: string, tracks: Track[], source: SourceType): void {
  const key = categoryKey(category);
  setInMemory(key, tracks, CACHE_CONFIG.trending, source);
}

/**
 * Get cached home feed.
 */
export async function getCachedHomeFeed(): Promise<Track[] | null> {
  const key = homeFeedKey();
  const memResult = getFromMemory<Track[]>(key);
  if (memResult) return memResult;

  const dbResult = await getFromDB<Track[]>(key);
  if (dbResult) {
    setInMemory(key, dbResult, CACHE_CONFIG.homeFeed);
    return dbResult;
  }

  return null;
}

/**
 * Cache home feed tracks.
 */
export async function cacheHomeFeed(tracks: Track[], source: SourceType): Promise<void> {
  const key = homeFeedKey();
  setInMemory(key, tracks, CACHE_CONFIG.homeFeed, source);
  await setInDB(key, tracks, CACHE_CONFIG.homeFeed, source);
}

/**
 * Get cached recommendations.
 */
export function getCachedRecommendations(seed: string): Track[] | null {
  const key = recommendationKey(seed);
  return getFromMemory<Track[]>(key);
}

/**
 * Cache recommendations.
 */
export function cacheRecommendations(seed: string, tracks: Track[], source: SourceType): void {
  const key = recommendationKey(seed);
  setInMemory(key, tracks, CACHE_CONFIG.recommendations, source);
}

/**
 * Cache YouTube responses for 30 days (quota protection).
 */
export async function cacheYouTubeResponse(key: string, data: unknown): Promise<void> {
  setInMemory(`yt:${key}`, data, CACHE_CONFIG.youtube, 'youtube');
  await setInDB(`yt:${key}`, data, CACHE_CONFIG.youtube, 'youtube');
}

/**
 * Get cached YouTube response.
 */
export async function getCachedYouTubeResponse<T>(key: string): Promise<T | null> {
  const memResult = getFromMemory<T>(`yt:${key}`);
  if (memResult) return memResult;
  return getFromDB<T>(`yt:${key}`);
}

/**
 * Search local cache (IndexedDB songs table).
 * This provides search even when offline.
 */
export async function searchLocalCache(query: string, limit: number = 20): Promise<Track[]> {
  try {
    const results = await dbSearchSongs(query);
    return results.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Get all cached songs (for offline display).
 */
export async function getAllCachedTracks(limit: number = 50): Promise<Track[]> {
  try {
    const songs = await getAllSongs();
    return songs.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Get recently cached tracks (fallback for home screen).
 */
export async function getRecentCachedTracks(limit: number = 20): Promise<Track[]> {
  try {
    const songs = await getAllSongs();
    return songs
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Clear all caches.
 */
export function clearAllCaches(): void {
  memoryCache.clear();
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { memorySize: number } {
  return { memorySize: memoryCache.size };
}
