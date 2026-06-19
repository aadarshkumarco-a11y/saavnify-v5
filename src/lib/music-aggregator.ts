// ============================================================
// SAAVNIFY V4 - Multi-Source Music Aggregator Engine
// Central orchestrator that combines all music sources
// into one unified experience. Source switching is invisible.
//
// Priority: InnerTube → Piped → Local Cache → JioSaavn
// InnerTube: YouTube's private API via Cloudflare Worker proxy.
//            Direct audio URLs, global catalog, no auth needed.
// Emergency only: JioSaavn (Bollywood-only fallback)
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
 * Unified search with strict priority: InnerTube → Piped → Cache → JioSaavn.
 * Stops immediately when results are found. No parallel source querying.
 */
export async function unifiedSearch(query: string, maxResults: number = 20): Promise<SearchResult> {
  // Step 0: Check cache first (fastest path)
  const cached = await getCachedSearch(query);
  if (cached && cached.tracks.length > 0) {
    return cached;
  }

  // Step 1: InnerTube (PRIMARY — global YouTube catalog, direct stream URLs)
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

  // Step 2: Piped (secondary — YouTube content via privacy proxy)
  if (sourceHealth.piped.available) {
    try {
      const result = await searchPiped(query, maxResults);
      if (result.tracks.length > 0) {
        markSourceSuccess('piped');
        // Piped found results - cache and return immediately
        await cacheSearchResults(query, result, 'piped');
        return result;
      }
    } catch (error) {
      console.error('Piped search error:', error);
      markSourceFailed('piped');
    }
  }

  // Step 3: Local Cache (fast, no API call)
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

  // Step 4: JioSaavn (emergency fallback — Bollywood/Indian content)
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
  // Priority 1: InnerTube (global YouTube trending, direct stream URLs)
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

  // Priority 2: Piped (PRIMARY source for trending Indian content)
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

  // Priority 3: Local Cache
  try {
    const tracks = await getRecentCachedTracks(limit);
    if (tracks.length > 0) {
      return tracks.map(t => ({ ...t, source: 'cache' as SourceType }));
    }
  } catch {
    // Ignore
  }

  // Priority 4: JioSaavn (emergency fallback for trending)
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

  return [];
}

// ============================================================
// PUBLIC API - Category/Mood Search
// ============================================================

/**
 * Search music by category/mood - InnerTube PRIMARY.
 */
export async function searchByMood(mood: string, limit: number = 20): Promise<Track[]> {
  // Check cache
  const cached = getCachedCategory(mood);
  if (cached && cached.length > 0) return cached.slice(0, limit);

  // Priority 1: InnerTube (best for global catalog)
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

  // Priority 2: Piped (best for Indian music categories via YouTube content)
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

  // Priority 3: Local Cache
  try {
    const cachedTracks = await searchLocalCache(mood, limit);
    if (cachedTracks.length > 0) {
      return cachedTracks.map(t => ({ ...t, source: 'cache' as SourceType }));
    }
  } catch {
    // Ignore
  }

  // Priority 4: JioSaavn (emergency fallback)
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
 * InnerTube tracks get direct audio stream URLs (preferred — works
 * with HTML5 Audio, no IFrame needed, background-playable).
 * Piped tracks get direct audio stream URLs.
 * YouTube tracks that fail InnerTube resolution fall back to the
 * YouTube IFrame Player (returns null).
 */
export async function resolveStreamUrl(track: Track): Promise<string | null> {
  // If track already has a stream URL, use it
  if (track.streamUrl) return track.streamUrl;

  // If it's a YouTube/InnerTube track, try to resolve a direct audio URL
  // via InnerTube's /player endpoint. This is the critical fix that
  // replaces the previous "return null → IFrame only" behaviour.
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
    // InnerTube failed — return null so the YouTube IFrame Player kicks in
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

    case 'jiosaavn': {
      try {
        const songId = track.id.replace('js-', '');
        const details = await getJioSaavnSongDetails(songId);
        if (details?.streamUrl) return details.streamUrl;
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
