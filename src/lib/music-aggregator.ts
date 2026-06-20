// ============================================================
// SAAVNIFY V4 - Multi-Source Music Aggregator Engine
// Central orchestrator that combines all music sources
// into one unified experience. Source switching is invisible.
//
// Priority: JioSaavn → InnerTube → Piped → Local Cache
// JioSaavn: Primary — public API with direct MP4 audio URLs,
//           no auth/proxy needed, works in browser.
// InnerTube/Piped: fallback if JioSaavn API is down.
// ============================================================

import type { Track, Artist, Album, SearchResult, SourceType } from '@/types';
import {
  searchPiped,
  getPipedTrending,
  searchPipedByCategory,
  isPipedAvailable,
  getPipedStreamUrl,
  getPipedRelated,
  getPipedTopArtists,
  getPipedChannel,
  INDIAN_CATEGORIES,
} from '@/lib/sources/piped-api';
import {
  searchInnertube,
  getInnertubeTrending,
  searchInnertubeByCategory,
  isInnertubeAvailable,
  getInnertubeStreamUrl,
} from '@/lib/sources/innertube-api';
import {
  searchJioSaavn,
  getJioSaavnTrending,
  searchJioSaavnByCategory,
  isJioSaavnAvailable,
  getJioSaavnSongDetails,
} from '@/lib/sources/jiosaavn-api';
import {
  getCachedSearch,
  cacheSearchResults,
  getCachedTrending,
  cacheTrending,
  getCachedCategory,
  cacheCategory,
  searchLocalCache,
  getRecentCachedTracks,
  cacheHomeFeed,
  getCachedHomeFeed,
} from '@/lib/sources/cache-manager';

// ---- Source Health Tracking ----

interface SourceHealth {
  available: boolean;
  lastChecked: number;
  failCount: number;
}

const sourceHealth: Record<string, SourceHealth> = {
  innertube: { available: true, lastChecked: 0, failCount: 0 },
  piped: { available: true, lastChecked: 0, failCount: 0 },
  youtube: { available: true, lastChecked: 0, failCount: 0 },
  // Legacy sources - emergency only
  jiosaavn: { available: true, lastChecked: 0, failCount: 0 },
};

function markSourceFailed(source: string): void {
  const health = sourceHealth[source];
  if (health) {
    health.failCount += 1;
    if (health.failCount >= 3) {
      health.available = false;
      setTimeout(() => {
        if (sourceHealth[source]) {
          sourceHealth[source].available = true;
          sourceHealth[source].failCount = 0;
        }
      }, 5 * 60 * 1000);
    }
  }
}

function markSourceSuccess(source: string): void {
  const health = sourceHealth[source];
  if (health) {
    health.available = true;
    health.failCount = 0;
    health.lastChecked = Date.now();
  }
}

// ---- Deduplication Utility ----

function deduplicateTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const result: Track[] = [];
  for (const track of tracks) {
    const key = `${track.videoId}:${track.source}`;
    if (!seen.has(key) && !seen.has(track.videoId)) {
      seen.add(key);
      seen.add(track.videoId);
      result.push(track);
    }
  }
  return result;
}

// ============================================================
// PUBLIC API - Unified Search
// ============================================================

/**
 * Unified search with strict priority: JioSaavn → InnerTube → Piped → Cache.
 * JioSaavn is primary because it returns direct MP4 URLs (no proxy needed).
 */
export async function unifiedSearch(query: string, maxResults: number = 20): Promise<SearchResult> {
  // Step 0: Check cache first (fastest path)
  const cached = await getCachedSearch(query);
  if (cached && cached.tracks.length > 0) {
    return cached;
  }

  // Step 1: JioSaavn (PRIMARY — direct MP4 URLs, works in browser)
  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn(query, maxResults);
      if (result.tracks.length > 0) {
        markSourceSuccess('jiosaavn');
        const searchResult: SearchResult = {
          tracks: result.tracks.slice(0, maxResults),
          artists: result.artists,
          albums: result.albums,
          playlists: [],
        };
        await cacheSearchResults(query, searchResult, 'jiosaavn');
        return searchResult;
      }
    } catch (error) {
      console.error('JioSaavn search error:', error);
      markSourceFailed('jiosaavn');
    }
  }

  // Step 2: InnerTube (fallback — needs Cloudflare Worker proxy)
  if (sourceHealth.innertube.available) {
    try {
      const result = await searchInnertube(query, maxResults);
      if (result.tracks.length > 0) {
        markSourceSuccess('innertube');
        await cacheSearchResults(query, result, 'youtube');
        return result;
      }
    } catch (error) {
      console.error('InnerTube search error:', error);
      markSourceFailed('innertube');
    }
  }

  // Step 3: Piped (secondary fallback)
  if (sourceHealth.piped.available) {
    try {
      const result = await searchPiped(query, maxResults);
      if (result.tracks.length > 0) {
        markSourceSuccess('piped');
        await cacheSearchResults(query, result, 'piped');
        return result;
      }
    } catch (error) {
      console.error('Piped search error:', error);
      markSourceFailed('piped');
    }
  }

  // Step 4: Local Cache (last resort)
  try {
    const cachedTracks = await searchLocalCache(query, maxResults);
    if (cachedTracks.length > 0) {
      const searchResult: SearchResult = {
        tracks: cachedTracks.map(t => ({ ...t, source: 'cache' })),
        artists: [],
        albums: [],
        playlists: [],
      };
      return searchResult;
    }
  } catch {
    // Ignore cache errors
  }

  // No results from any source
  return { tracks: [], artists: [], albums: [], playlists: [] };
}

// ============================================================
// PUBLIC API - Trending / Home Feed
// ============================================================

/**
 * Get trending music - Piped PRIMARY for Indian content.
 * Returns cached content immediately, refreshes in background.
 */
export async function getAggregatedTrending(limit: number = 20): Promise<Track[]> {
  // Check cache first
  const cached = await getCachedTrending();
  if (cached && cached.length > 0) {
    // Return cached immediately, refresh in background
    refreshTrendingInBackground(limit);
    return cached.slice(0, limit);
  }

  return refreshTrendingInBackground(limit);
}

async function refreshTrendingInBackground(limit: number): Promise<Track[]> {
  // Priority 1: JioSaavn (direct MP4 URLs, works in browser)
  if (sourceHealth.jiosaavn.available) {
    try {
      const tracks = await getJioSaavnTrending(limit);
      if (tracks.length > 0) {
        markSourceSuccess('jiosaavn');
        await cacheTrending(tracks, 'jiosaavn');
        return tracks.slice(0, limit);
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  // Priority 2: InnerTube (fallback — needs proxy)
  if (sourceHealth.innertube.available) {
    try {
      const tracks = await getInnertubeTrending(limit);
      if (tracks.length > 0) {
        markSourceSuccess('innertube');
        await cacheTrending(tracks, 'youtube');
        return tracks.slice(0, limit);
      }
    } catch {
      markSourceFailed('innertube');
    }
  }

  // Priority 3: Piped
  if (sourceHealth.piped.available) {
    try {
      const tracks = await getPipedTrending('IN', limit);
      if (tracks.length > 0) {
        markSourceSuccess('piped');
        await cacheTrending(tracks, 'piped');
        return tracks.slice(0, limit);
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  // Priority 4: Local Cache
  try {
    const tracks = await getRecentCachedTracks(limit);
    if (tracks.length > 0) {
      return tracks.map(t => ({ ...t, source: 'cache' as SourceType }));
    }
  } catch {
    // Ignore
  }

  return [];
}

// ============================================================
// PUBLIC API - Category/Mood Search
// ============================================================

/**
 * Search music by category/mood - JioSaavn PRIMARY.
 */
export async function searchByMood(mood: string, limit: number = 20): Promise<Track[]> {
  // Check cache
  const cached = getCachedCategory(mood);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  // Priority 1: JioSaavn (direct MP4 URLs, no proxy)
  if (sourceHealth.jiosaavn.available) {
    try {
      const tracks = await searchJioSaavnByCategory(mood);
      markSourceSuccess('jiosaavn');
      if (tracks.length > 0) {
        const result = deduplicateTracks(tracks).slice(0, limit);
        cacheCategory(mood, result, 'jiosaavn');
        return result;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  // Priority 2: InnerTube (fallback)
  if (sourceHealth.innertube.available) {
    try {
      const tracks = await searchInnertubeByCategory(mood, limit);
      markSourceSuccess('innertube');
      if (tracks.length > 0) {
        const result = deduplicateTracks(tracks).slice(0, limit);
        cacheCategory(mood, result, 'youtube');
        return result;
      }
    } catch {
      markSourceFailed('innertube');
    }
  }

  // Priority 3: Piped
  if (sourceHealth.piped.available) {
    try {
      const tracks = await searchPipedByCategory(mood, limit);
      markSourceSuccess('piped');
      if (tracks.length > 0) {
        const result = deduplicateTracks(tracks).slice(0, limit);
        cacheCategory(mood, result, 'piped');
        return result;
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  // Priority 4: Local Cache
  try {
    const cachedTracks = await searchLocalCache(mood, limit);
    if (cachedTracks.length > 0) {
      return cachedTracks.map(t => ({ ...t, source: 'cache' as SourceType }));
    }
  } catch {
    // Ignore
  }

  return [];
}

// ============================================================
// PUBLIC API - Indian Music Specific Sections
// ============================================================

/** Get Bollywood Hits - Piped primary */
export async function getBollywoodHits(limit: number = 20): Promise<Track[]> {
  const cacheKey = 'bollywood-hits';
  const cached = getCachedCategory(cacheKey);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  if (sourceHealth.piped.available) {
    try {
      const tracks = await searchPipedByCategory('bollywood', limit);
      markSourceSuccess('piped');
      if (tracks.length > 0) {
        cacheCategory(cacheKey, tracks, 'piped');
        return tracks;
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  // Emergency fallback to JioSaavn
  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('bollywood hits latest', limit);
      markSourceSuccess('jiosaavn');
      if (result.tracks.length > 0) {
        cacheCategory(cacheKey, result.tracks, 'jiosaavn');
        return result.tracks;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  return [];
}

/** Get Punjabi Hits - Piped primary */
export async function getPunjabiHits(limit: number = 20): Promise<Track[]> {
  const cacheKey = 'punjabi-hits';
  const cached = getCachedCategory(cacheKey);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  if (sourceHealth.piped.available) {
    try {
      const tracks = await searchPipedByCategory('punjabi', limit);
      markSourceSuccess('piped');
      if (tracks.length > 0) {
        cacheCategory(cacheKey, tracks, 'piped');
        return tracks;
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('punjabi hits latest', limit);
      markSourceSuccess('jiosaavn');
      if (result.tracks.length > 0) {
        cacheCategory(cacheKey, result.tracks, 'jiosaavn');
        return result.tracks;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  return [];
}

/** Get Hindi Romantic - Piped primary */
export async function getHindiRomantic(limit: number = 20): Promise<Track[]> {
  const cacheKey = 'hindi-romantic';
  const cached = getCachedCategory(cacheKey);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  if (sourceHealth.piped.available) {
    try {
      const tracks = await searchPipedByCategory('hindiRomantic', limit);
      markSourceSuccess('piped');
      if (tracks.length > 0) {
        cacheCategory(cacheKey, tracks, 'piped');
        return tracks;
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('hindi romantic songs', limit);
      markSourceSuccess('jiosaavn');
      if (result.tracks.length > 0) {
        cacheCategory(cacheKey, result.tracks, 'jiosaavn');
        return result.tracks;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  return [];
}

/** Get Lo-Fi India - Piped primary */
export async function getLoFiIndia(limit: number = 20): Promise<Track[]> {
  const cacheKey = 'lofi-india';
  const cached = getCachedCategory(cacheKey);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  if (sourceHealth.piped.available) {
    try {
      const tracks = await searchPipedByCategory('lofi', limit);
      markSourceSuccess('piped');
      if (tracks.length > 0) {
        cacheCategory(cacheKey, tracks, 'piped');
        return tracks;
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('lofi india hindi', limit);
      markSourceSuccess('jiosaavn');
      if (result.tracks.length > 0) {
        cacheCategory(cacheKey, result.tracks, 'jiosaavn');
        return result.tracks;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  return [];
}

/** Get Workout India - Piped primary */
export async function getWorkoutIndia(limit: number = 20): Promise<Track[]> {
  const cacheKey = 'workout-india';
  const cached = getCachedCategory(cacheKey);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  if (sourceHealth.piped.available) {
    try {
      const tracks = await searchPipedByCategory('workout', limit);
      markSourceSuccess('piped');
      if (tracks.length > 0) {
        cacheCategory(cacheKey, tracks, 'piped');
        return tracks;
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('workout music hindi punjabi', limit);
      markSourceSuccess('jiosaavn');
      if (result.tracks.length > 0) {
        cacheCategory(cacheKey, result.tracks, 'jiosaavn');
        return result.tracks;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  return [];
}

/** Get Devotional - Piped primary */
export async function getDevotional(limit: number = 20): Promise<Track[]> {
  const cacheKey = 'devotional';
  const cached = getCachedCategory(cacheKey);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  if (sourceHealth.piped.available) {
    try {
      const tracks = await searchPipedByCategory('devotional', limit);
      markSourceSuccess('piped');
      if (tracks.length > 0) {
        cacheCategory(cacheKey, tracks, 'piped');
        return tracks;
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('devotional songs bhakti', limit);
      markSourceSuccess('jiosaavn');
      if (result.tracks.length > 0) {
        cacheCategory(cacheKey, result.tracks, 'jiosaavn');
        return result.tracks;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  return [];
}

/** Get New Releases India - Piped primary */
export async function getNewReleasesIndia(limit: number = 20): Promise<Track[]> {
  const cacheKey = 'new-releases-india';
  const cached = getCachedCategory(cacheKey);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  if (sourceHealth.piped.available) {
    try {
      // Search for new Hindi/Punjabi songs
      const result = await searchPiped('new hindi songs 2025 2026 latest bollywood', limit);
      markSourceSuccess('piped');
      if (result.tracks.length > 0) {
        cacheCategory(cacheKey, result.tracks, 'piped');
        return result.tracks;
      }
    } catch {
      markSourceFailed('piped');
    }
  }

  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('new hindi punjabi songs 2025', limit);
      markSourceSuccess('jiosaavn');
      if (result.tracks.length > 0) {
        cacheCategory(cacheKey, result.tracks, 'jiosaavn');
        return result.tracks;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  return [];
}

/** Get Top Indian Artists - Piped primary */
export async function getTopIndianArtists(): Promise<Artist[]> {
  if (sourceHealth.piped.available) {
    try {
      const artists = await getPipedTopArtists();
      markSourceSuccess('piped');
      return artists;
    } catch {
      markSourceFailed('piped');
    }
  }

  // Fallback to JioSaavn
  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('top artists india', 15);
      if (result.artists.length > 0) {
        markSourceSuccess('jiosaavn');
        return result.artists;
      }
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  // Return defaults
  return (await import('@/lib/sources/piped-api')).DEFAULT_INDIAN_ARTISTS;
}

// ============================================================
// PUBLIC API - Related Songs / More Like This
// ============================================================

/**
 * Get tracks related to a given track.
 * Uses Piped first (best for Indian music), then JioSaavn.
 */
export async function getRelatedTracks(track: Track, limit: number = 15): Promise<Track[]> {
  const allTracks: Track[] = [];
  const seenVideoIds = new Set<string>([track.videoId]);

  // Strategy 1: Piped related streams (best for YouTube-sourced content)
  if (sourceHealth.piped.available && track.videoId) {
    try {
      const related = await getPipedRelated(track.videoId, limit);
      for (const t of related) {
        if (!seenVideoIds.has(t.videoId)) {
          seenVideoIds.add(t.videoId);
          allTracks.push(t);
        }
      }
      markSourceSuccess('piped');
    } catch {
      markSourceFailed('piped');
    }
  }

  // If Piped gave enough results, return immediately
  if (allTracks.length >= limit) {
    return deduplicateTracks(allTracks).slice(0, limit);
  }

  // Strategy 2: Search by artist name on Piped
  if (allTracks.length < limit && sourceHealth.piped.available) {
    try {
      const artistQuery = `${track.artist} songs`;
      const result = await searchPiped(artistQuery, limit);
      for (const t of result.tracks) {
        if (!seenVideoIds.has(t.videoId)) {
          seenVideoIds.add(t.videoId);
          allTracks.push(t);
        }
      }
    } catch {
      // Ignore
    }
  }

  // Strategy 3: JioSaavn search with artist name
  if (allTracks.length < 3 && sourceHealth.jiosaavn.available) {
    try {
      const artistQuery = `${track.artist} songs`;
      const result = await searchJioSaavn(artistQuery, limit);
      for (const t of result.tracks) {
        if (!seenVideoIds.has(t.videoId)) {
          seenVideoIds.add(t.videoId);
          allTracks.push(t);
        }
      }
    } catch {
      // Ignore
    }
  }

  return deduplicateTracks(allTracks).slice(0, limit);
}

// ============================================================
// PUBLIC API - Stream URL Resolution
// ============================================================

/**
 * Get the best available stream URL for a track.
 * JioSaavn tracks get direct MP4 audio URLs (primary — no proxy needed).
 * InnerTube/Piped tracks may need their respective resolvers.
 * YouTube tracks that fail all resolvers fall back to the YouTube IFrame Player.
 */
export async function resolveStreamUrl(track: Track): Promise<string | null> {
  // If track already has a stream URL, use it
  if (track.streamUrl) return track.streamUrl;

  // JioSaavn tracks — direct MP4 URLs (primary path)
  if (track.source === 'jiosaavn' || track.id.startsWith('js-')) {
    try {
      const songId = track.id.replace('js-', '');
      const details = await getJioSaavnSongDetails(songId);
      if (details?.streamUrl) return details.streamUrl;
    } catch {
      // Fall through to other sources
    }
    return null;
  }

  // If it's a YouTube/InnerTube track, try to resolve a direct audio URL
  if (
    track.source === 'youtube' ||
    track.id.startsWith('yt-')
  ) {
    if (sourceHealth.innertube.available && track.videoId) {
      try {
        const streamUrl = await getInnertubeStreamUrl(track.videoId);
        if (streamUrl) return streamUrl;
      } catch {
        // Fall through to null (IFrame fallback)
      }
    }
    return null;
  }

  // Try to resolve based on source
  switch (track.source) {
    case 'piped': {
      try {
        const streamUrl = await getPipedStreamUrl(track.videoId);
        if (streamUrl) return streamUrl;
      } catch {
        // Fall through
      }
      break;
    }

    case 'archive': {
      // Archive tracks should have streamUrl already
      break;
    }

    case 'jamendo':
    case 'audius':
      // These should have streamUrl already set
      break;

    case 'cache': {
      // Try to resolve the original source
      if (track.videoId) {
        // Try InnerTube first (most reliable for YouTube IDs)
        if (sourceHealth.innertube.available) {
          try {
            const streamUrl = await getInnertubeStreamUrl(track.videoId);
            if (streamUrl) return streamUrl;
          } catch {
            // Ignore
          }
        }
        // Then try Piped
        try {
          const streamUrl = await getPipedStreamUrl(track.videoId);
          if (streamUrl) return streamUrl;
        } catch {
          // Ignore
        }
      }
      break;
    }
  }

  return null;
}

// ============================================================
// PUBLIC API - Source Health & Statistics
// ============================================================

export async function checkSourceHealth(): Promise<Record<string, boolean>> {
  const results = await Promise.allSettled([
    isInnertubeAvailable(),
    isPipedAvailable(),
    isJioSaavnAvailable(),
  ]);

  return {
    innertube: results[0].status === 'fulfilled' ? results[0].value : false,
    piped: results[1].status === 'fulfilled' ? results[1].value : false,
    jiosaavn: results[2].status === 'fulfilled' ? results[2].value : false,
  };
}

export function getSourceStatus(): Record<string, SourceHealth> {
  return { ...sourceHealth };
}

// ============================================================
// PUBLIC API - New Releases (kept for backward compat)
// ============================================================

/**
 * Get new releases - Piped PRIMARY.
 */
export async function getNewReleases(limit: number = 20): Promise<Track[]> {
  // Priority 1: Piped
  if (sourceHealth.piped.available) {
    try {
      const result = await searchPiped('new hindi punjabi songs 2025 2026', limit);
      markSourceSuccess('piped');
      if (result.tracks.length > 0) return result.tracks;
    } catch {
      markSourceFailed('piped');
    }
  }

  // Priority 2: JioSaavn
  if (sourceHealth.jiosaavn.available) {
    try {
      const result = await searchJioSaavn('new hindi songs 2025', limit);
      markSourceSuccess('jiosaavn');
      if (result.tracks.length > 0) return result.tracks;
    } catch {
      markSourceFailed('jiosaavn');
    }
  }

  return [];
}

// ============================================================
// EXPANDED LIBRARY — many more content fetchers
// (regional Indian, international, decades, moods, devotional)
// Each reuses the unified search pipeline with curated queries.
// ============================================================

/** Generic helper: search across all sources for a query, return tracks. */
async function searchCurated(query: string, limit = 20): Promise<Track[]> {
  try {
    const result = await unifiedSearch(query, limit);
    return result.tracks;
  } catch {
    return [];
  }
}

// ---- Regional Indian (beyond Bollywood/Punjabi) ----
export async function getTamilHits(limit = 20) { return searchCurated('tamil hits songs kollywood 2024', limit); }
export async function getTeluguHits(limit = 20) { return searchCurated('telugu hits songs tollywood 2024', limit); }
export async function getMarathiHits(limit = 20) { return searchCurated('marathi songs hits latest', limit); }
export async function getBengaliHits(limit = 20) { return searchCurated('bengali songs hits latest tollywood', limit); }
export async function getKannadaHits(limit = 20) { return searchCurated('kannada hits songs sandalwood', limit); }
export async function getMalayalamHits(limit = 20) { return searchCurated('malayalam hits songs mollywood', limit); }
export async function getGujaratiHits(limit = 20) { return searchCurated('gujarati songs hits latest', limit); }
export async function getHaryanviHits(limit = 20) { return searchCurated('haryanvi songs hits latest', limit); }
export async function getBhojpuriHits(limit = 20) { return searchCurated('bhojpuri songs hits latest', limit); }
export async function getRajasthaniHits(limit = 20) { return searchCurated('rajasthani songs hits latest', limit); }
export async function getAssameseHits(limit = 20) { return searchCurated('assamese songs hits latest', limit); }
export async function getOdiaHits(limit = 20) { return searchCurated('odia songs hits latest', limit); }

// ---- Indian Classical & Devotional ----
export async function getIndianClassical(limit = 20) { return searchCurated('indian classical music raga sitar tabla', limit); }
export async function getBhajans(limit = 20) { return searchCurated('bhajan bhakti songs hindi devotional', limit); }
export async function getGurbani(limit = 20) { return searchCurated('gurbani shabad kirtan sikh devotional', limit); }
export async function getSufi(limit = 20) { return searchCurated('sufi music qawwali hindi urdu', limit); }
export async function getGhazals(limit = 20) { return searchCurated('ghazal urdu hindi jagjit singh ghulam ali', limit); }

// ---- Moods ----
export async function getPartyHindi(limit = 20) { return searchCurated('party songs hindi bollywood dance', limit); }
export async function getSadHindi(limit = 20) { return searchCurated('sad songs hindi emotional bollywood', limit); }
export async function getRomanticHindi(limit = 20) { return searchCurated('romantic songs hindi love bollywood', limit); }
export async function getRoadTrip(limit = 20) { return searchCurated('road trip songs hindi travel', limit); }
export async function getMorningPlaylist(limit = 20) { return searchCurated('morning playlist hindi fresh start', limit); }
export async function getNightPlaylist(limit = 20) { return searchCurated('night playlist hindi chill sleep', limit); }
export async function getFocusStudy(limit = 20) { return searchCurated('focus study music instrumental lofi', limit); }
export async function getDanceHindi(limit = 20) { return searchCurated('dance songs hindi bollywood dj party', limit); }

// ---- Decades ----
export async function get90sBollywood(limit = 20) { return searchCurated('90s bollywood hindi songs old hits', limit); }
export async function get2000sBollywood(limit = 20) { return searchCurated('2000s bollywood hindi songs hits', limit); }
export async function get2010sBollywood(limit = 20) { return searchCurated('2010s bollywood hindi songs hits', limit); }
export async function getOldIsGold(limit = 20) { return searchCurated('old hindi songs golden era mukesh rafi kishore', limit); }
export async function getRetroBollywood(limit = 20) { return searchCurated('retro hindi songs old bollywood 70s 80s', limit); }

// ---- International ----
export async function getEnglishPop(limit = 20) { return searchCurated('english pop songs hits 2024', limit); }
export async function getEnglishHits(limit = 20) { return searchCurated('top english songs hits billboard', limit); }
export async function getGlobalHits(limit = 20) { return searchCurated('global top hits songs 2024', limit); }
export async function getKPop(limit = 20) { return searchCurated('kpop korean pop songs hits bts blackpink', limit); }
export async function getLatinHits(limit = 20) { return searchCurated('latin music spanish hits reggaeton', limit); }
export async function getEDM(limit = 20) { return searchCurated('edm electronic dance music festival', limit); }
export async function getHipHop(limit = 20) { return searchCurated('hip hop rap songs hits 2024', limit); }
export async function getRnB(limit = 20) { return searchCurated('rnb r&b soul songs hits', limit); }
export async function getRock(limit = 20) { return searchCurated('rock songs hits classic alternative', limit); }
export async function getJazz(limit = 20) { return searchCurated('jazz music smooth instrumental classic', limit); }
export async function getCountry(limit = 20) { return searchCurated('country music songs hits', limit); }
export async function getReggae(limit = 20) { return searchCurated('reggae music songs bob marley', limit); }

// ---- Indie & Alternative ----
export async function getIndieHindi(limit = 20) { return searchCurated('indie india hindi alternative music prateek kuhar', limit); }
export async function getIndieEnglish(limit = 20) { return searchCurated('indie alternative english songs', limit); }
export async function getAcoustic(limit = 20) { return searchCurated('acoustic songs covers hindi english', limit); }
export async function getBollywoodAcoustic(limit = 20) { return searchCurated('bollywood acoustic cover songs unplugged', limit); }

// ---- Special Collections ----
export async function getTopArtists2024(limit = 20) { return searchCurated('top artists 2024 hits arijit singh', limit); }
export async function getArijitSingh(limit = 20) { return searchCurated('arijit singh songs hits bollywood', limit); }
export async function getAtifAslam(limit = 20) { return searchCurated('atif aslam songs hits bollywood', limit); }
export async function getShreyaGhoshal(limit = 20) { return searchCurated('shreya ghoshal songs hits bollywood', limit); }
export async function getDiljitDosanjh(limit = 20) { return searchCurated('diljit dosanjh songs hits punjabi', limit); }
export async function getSidhuMooseWala(limit = 20) { return searchCurated('sidhu moose wala songs punjabi hits', limit); }
export async function getAPDhillon(limit = 20) { return searchCurated('ap dhillon songs punjabi brownprint', limit); }
export async function getNehaKakkar(limit = 20) { return searchCurated('neha kakkar songs hits bollywood', limit); }
export async function getJubinNautiyal(limit = 20) { return searchCurated('jubin nautiyal songs hits bollywood', limit); }
export async function getPritam(limit = 20) { return searchCurated('pritam songs hits bollywood music director', limit); }
export async function getVishalShekhar(limit = 20) { return searchCurated('vishal shekhar songs hits bollywood', limit); }
export async function getARRahman(limit = 20) { return searchCurated('a r rahman songs hits bollywood tamil', limit); }

// ---- Podcasts & Spoken (curated) ----
export async function getHindiPodcasts(limit = 20) { return searchCurated('hindi podcast episodes stories', limit); }
export async function getMotivationalHindi(limit = 20) { return searchCurated('motivational hindi speech sandeep maheshwari', limit); }

// ---- Festive & Seasonal ----
export async function getHoliSongs(limit = 20) { return searchCurated('holi songs hindi bollywood festival', limit); }
export async function getDiwaliSongs(limit = 20) { return searchCurated('diwali songs hindi festival celebration', limit); }
export async function getWeddingSongs(limit = 20) { return searchCurated('wedding songs hindi bollywood sangeet', limit); }
export async function getIndependenceDay(limit = 20) { return searchCurated('independence day india patriotic songs hindi', limit); }
