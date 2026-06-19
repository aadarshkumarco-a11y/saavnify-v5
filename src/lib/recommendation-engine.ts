// ============================================================
// SAAVNIFY V4 - Recommendation Engine
// India-focused local recommendation engine
// Prioritizes: Bollywood, Hindi, Punjabi, Regional, Devotional
// ============================================================

import { unifiedSearch, searchByMood, getRelatedTracks } from '@/lib/music-aggregator';
import { addRecommendation, clearRecommendations, getRecommendations } from '@/lib/db';
import type { Track, Artist, HistoryEntry, Recommendation } from '@/types';

// ---- Types ----

export interface HomeSection {
  id: string;
  title: string;
  tracks: Track[];
  icon: string;
  reason: string;
}

export interface ScoredTrack {
  track: Track;
  score: number;
  reason: string;
}

/** Cache TTL: 12 hours */
const CACHE_TTL = 12 * 60 * 60 * 1000;

/** In-memory cache for recommendations */
const recommendationCache = new Map<string, { data: Track[]; timestamp: number }>();

// ---- Indian Music Priority Constants ----

const INDIAN_GENRE_KEYWORDS = [
  'bollywood', 'hindi', 'punjabi', 'tamil', 'telugu', 'malayalam',
  'kannada', 'bhojpuri', 'marathi', 'gujarati', 'bengali', 'urdu',
  'devotional', 'bhakti', 'ghazal', 'indian', 'indie', 'desi',
  'haryanvi', 'rajasthani', 'odia', 'assamese', 'lofi india',
];

const INDIAN_ARTIST_NAMES = [
  'arijit singh', 'pritam', 'shreya ghoshal', 'sonu nigam', 'ap dhillon',
  'neha kakkar', 'badshah', 'guru randhawa', 'atif aslam', 'vishal shekhar',
  'armaan malik', 'neeti mohan', 'darshan raval', 'jubin nautiyal',
  'payal dev', 'mika singh', 'rahat fateh ali khan', 'kk', 'shankar mahadevan',
  'udit narayan', 'alka yagnik', 'kumar sanu', 'kishore kumar',
  'lata mangeshkar', 'asha bhosle', 'mohammed rafi', 'k j yesudas',
  'diljit dosanjh', 'gurdas maan', 'sidhu moose wala', 'honey singh',
  'raftaar', 'divine', 'emiway bantai', 'prateek kuhad',
];

// ---- Main Recommendation Functions ----

/**
 * Get recommended songs - India-focused scoring.
 * Prioritizes Indian artists, Bollywood, Hindi/Punjabi music.
 */
export async function getRecommendedSongs(
  userProfile: { favoriteArtists: Artist[]; favoriteGenres: string[] },
  likedSongs: Track[],
  history: HistoryEntry[]
): Promise<Track[]> {
  try {
    const cacheKey = `rec-songs-${userProfile.favoriteArtists.length}-${likedSongs.length}`;
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Build search queries from user behavior
    const queries = buildSearchQueries(userProfile, likedSongs, history);

    const allTracks: ScoredTrack[] = [];
    const seenVideoIds = new Set<string>();

    // Execute searches sequentially (not parallel) to minimize API calls
    // Only use top 4 queries
    for (const q of queries.slice(0, 4)) {
      try {
        const result = await unifiedSearch(q.query, 10);
        for (const track of result.tracks) {
          if (seenVideoIds.has(track.videoId)) continue;
          seenVideoIds.add(track.videoId);

          const score = scoreTrack(track, userProfile, likedSongs, history, q.source);
          allTracks.push({ track, score: score.total, reason: score.reason });
        }
      } catch {
        // Continue with next query
      }
    }

    // Sort by score, filter out already-liked
    const likedIds = new Set(likedSongs.map((s) => s.id));
    const scored = allTracks
      .filter((st) => !likedIds.has(st.track.id))
      .sort((a, b) => b.score - a.score);

    const result = scored.slice(0, 30).map((st) => st.track);

    // Cache the result
    recommendationCache.set(cacheKey, { data: result, timestamp: Date.now() });

    // Save to IndexedDB for offline
    await saveRecommendationsToDB(scored.slice(0, 20));

    return result;
  } catch (error) {
    console.error('Failed to get recommended songs:', error);
    return getCachedRecommendations();
  }
}

/**
 * Get recommended artists - India-focused.
 */
export async function getRecommendedArtists(
  userProfile: { favoriteGenres: string[] },
  favoriteArtists: Artist[]
): Promise<Artist[]> {
  try {
    if (favoriteArtists.length === 0 && userProfile.favoriteGenres.length === 0) {
      const result = await unifiedSearch('popular indian music artists', 15);
      return result.artists;
    }

    const queries: string[] = [];

    for (const artist of favoriteArtists.slice(0, 2)) {
      queries.push(`${artist.name} similar artists`);
    }

    // Add Indian genre queries
    for (const genre of userProfile.favoriteGenres.slice(0, 2)) {
      queries.push(`best ${genre} artists india`);
    }

    const allArtists: Artist[] = [];
    const seenChannelIds = new Set<string>();
    const favoriteChannelIds = new Set(favoriteArtists.map((a) => a.channelId));

    // Sequential search to reduce API calls
    for (const q of queries.slice(0, 3)) {
      try {
        const result = await unifiedSearch(q, 10);
        for (const artist of result.artists) {
          if (seenChannelIds.has(artist.channelId)) continue;
          seenChannelIds.add(artist.channelId);
          if (favoriteChannelIds.has(artist.channelId)) continue;
          allArtists.push(artist);
        }
      } catch {
        // Continue
      }
    }

    return allArtists.slice(0, 15);
  } catch (error) {
    console.error('Failed to get recommended artists:', error);
    return [];
  }
}

/**
 * Get tracks similar to a specific track (More Like This)
 * Uses JioSaavn-first approach.
 */
export async function getMoreLikeThis(track: Track): Promise<Track[]> {
  try {
    const cacheKey = `more-like-${track.videoId}`;
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Primary: search by artist name (best for Indian music)
    const artistQuery = `${track.artist} songs`;
    const searchResults = await unifiedSearch(artistQuery, 15);

    // Also search with a couple variations
    const titleKeywords = extractSongKeywords(track.title);
    let variationResults: Track[] = [];
    if (titleKeywords && titleKeywords !== track.artist.toLowerCase()) {
      const varResult = await unifiedSearch(`${titleKeywords} similar`, 8);
      variationResults = varResult.tracks;
    }

    // Combine and deduplicate
    const seenVideoIds = new Set<string>([track.id, track.videoId]);
    const allTracks: Track[] = [];

    for (const t of [...searchResults.tracks, ...variationResults]) {
      if (!seenVideoIds.has(t.videoId)) {
        seenVideoIds.add(t.videoId);
        allTracks.push(t);
      }
    }

    const result = allTracks.slice(0, 20);
    recommendationCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Failed to get more like this:', error);
    return [];
  }
}

/**
 * Get personalized home feed with India-focused sections.
 */
export async function getPersonalizedHomeFeed(
  userProfile: { favoriteArtists: Artist[]; favoriteGenres: string[] },
  likedSongs: Track[],
  history: HistoryEntry[]
): Promise<{ sections: HomeSection[] }> {
  try {
    const sections: HomeSection[] = [];

    // Section 1: Because You Listened To...
    if (history.length > 0) {
      const recentTrack = history[0]?.track;
      if (recentTrack) {
        const similar = await getMoreLikeThis(recentTrack);
        if (similar.length > 0) {
          sections.push({
            id: 'because-you-listened',
            title: `Because you listened to ${truncate(recentTrack.title, 25)}`,
            tracks: similar.slice(0, 10),
            icon: '🎧',
            reason: 'Based on your recent listening',
          });
        }
      }
    }

    // Section 2: Your Daily Mix (Indian artists focus)
    if (userProfile.favoriteArtists.length > 0) {
      const artistName = userProfile.favoriteArtists[0].name;
      const dailyResult = await unifiedSearch(`${artistName} top songs`, 15);

      if (dailyResult.tracks.length > 0) {
        sections.push({
          id: 'daily-mix',
          title: 'Your Daily Mix',
          tracks: shuffleArray(dailyResult.tracks).slice(0, 15),
          icon: '✨',
          reason: 'A mix of your favorite artists',
        });
      }
    }

    // Section 3: Hindi/Bollywood Mix
    const hindiResult = await searchByMood('hindi hits');
    if (hindiResult.length > 0) {
      sections.push({
        id: 'hindi-mix',
        title: 'Hindi Mix',
        tracks: hindiResult.slice(0, 10),
        icon: '🎵',
        reason: 'Popular Hindi songs for you',
      });
    }

    return { sections };
  } catch (error) {
    console.error('Failed to get personalized home feed:', error);
    return { sections: [] };
  }
}

// ---- Scoring Algorithm (India-focused) ----

interface TrackScore {
  total: number;
  reason: string;
}

/**
 * Score a track with Indian music priority.
 *
 * Scoring rules:
 * - Indian artist: +15 points
 * - Indian genre keyword match: +10 points
 * - JioSaavn source: +5 points (prefer over YouTube)
 * - Same artist as favorite: +10 points
 * - Same genre keyword: +5 points
 * - High view count: +3 points
 * - Not recently played: +2 points
 * - Already liked: -5 points (promote discovery)
 */
function scoreTrack(
  track: Track,
  userProfile: { favoriteArtists: Artist[]; favoriteGenres: string[] },
  likedSongs: Track[],
  history: HistoryEntry[],
  querySource: string
): TrackScore {
  let score = 0;
  let reason = '';

  const trackArtistLower = (track.artist || track.channelTitle || '').toLowerCase();
  const trackTitleLower = (track.title || '').toLowerCase();
  const allText = `${trackTitleLower} ${trackArtistLower}`;

  // +15: Indian artist bonus
  const isIndianArtist = INDIAN_ARTIST_NAMES.some(
    (name) => trackArtistLower.includes(name) || name.includes(trackArtistLower)
  );
  if (isIndianArtist) {
    score += 15;
    reason = 'Popular Indian artist';
  }

  // +10: Indian genre keyword bonus
  const isIndianGenre = INDIAN_GENRE_KEYWORDS.some(
    (keyword) => allText.includes(keyword)
  );
  if (isIndianGenre) {
    score += 10;
    if (!reason) reason = 'Matches Indian music taste';
  }

  // +5: Piped source (primary, prefer over YouTube)
  if (track.source === 'piped') {
    score += 5;
  }

  // +10: Same artist as a favorite artist
  const isFavoriteArtist = userProfile.favoriteArtists.some(
    (a) => a.name.toLowerCase() === trackArtistLower ||
      a.channelId === track.channelTitle
  );
  if (isFavoriteArtist) {
    score += 10;
    if (!reason) reason = 'From your favorite artist';
  }

  // +5: Same genre keyword
  const matchesGenre = userProfile.favoriteGenres.some((genre) =>
    allText.includes(genre.toLowerCase())
  );
  if (matchesGenre) {
    score += 5;
    if (!reason) reason = 'Matches your taste';
  }

  // +3: High view count
  const viewCount = parseInt(track.viewCount || '0', 10);
  if (viewCount > 1_000_000) {
    score += 3;
  } else if (viewCount > 100_000) {
    score += 1;
  }

  // +2: Not recently played
  const recentlyPlayed = history.slice(0, 100).some(
    (h) => h.songId === track.id || h.track.videoId === track.videoId
  );
  if (!recentlyPlayed) {
    score += 2;
  }

  // -5: Already liked (promote discovery)
  const isLiked = likedSongs.some((s) => s.id === track.id || s.videoId === track.videoId);
  if (isLiked) {
    score -= 5;
    if (!reason) reason = 'You might like this similar song';
  }

  // Default reason
  if (!reason) {
    reason = querySource === 'artist' ? 'Based on artists you like' : 'Based on your listening';
  }

  return { total: Math.max(score, 0), reason };
}

// ---- Search Query Builder (India-focused) ----

interface SearchQuery {
  query: string;
  source: string;
}

function buildSearchQueries(
  userProfile: { favoriteArtists: Artist[]; favoriteGenres: string[] },
  likedSongs: Track[],
  history: HistoryEntry[]
): SearchQuery[] {
  const queries: SearchQuery[] = [];

  // 1. Queries from favorite artists (top 2 only)
  for (const artist of userProfile.favoriteArtists.slice(0, 2)) {
    queries.push({
      query: `${artist.name} best songs`,
      source: 'artist',
    });
  }

  // 2. Queries from liked songs' artists (top 2)
  const likedArtistCounts = new Map<string, number>();
  for (const song of likedSongs.slice(0, 30)) {
    const artistName = song.artist || song.channelTitle;
    likedArtistCounts.set(artistName, (likedArtistCounts.get(artistName) || 0) + 1);
  }

  const topLikedArtists = Array.from(likedArtistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  for (const [artistName] of topLikedArtists) {
    queries.push({
      query: `${artistName} top songs`,
      source: 'artist',
    });
  }

  // 3. Indian music defaults (always include)
  queries.push({
    query: 'bollywood hits 2025',
    source: 'genre',
  });
  queries.push({
    query: 'hindi punjabi top songs',
    source: 'genre',
  });

  // 4. From recent history (top 1 artist)
  if (history.length > 0) {
    const recentArtist = history[0]?.track?.artist;
    if (recentArtist) {
      queries.push({
        query: `${recentArtist} similar songs`,
        source: 'history',
      });
    }
  }

  // 5. Genre-based queries
  for (const genre of userProfile.favoriteGenres.slice(0, 1)) {
    queries.push({
      query: `best ${genre} songs india`,
      source: 'genre',
    });
  }

  return queries;
}

// ---- Keyword Extraction ----

function extractSongKeywords(title: string): string {
  const stopWords = new Set([
    'official', 'video', 'music', 'song', 'audio', 'lyrics', 'hd',
    'remix', 'full', 'version', 'feat', 'ft', 'the', 'a', 'an',
    'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  ]);

  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return words.slice(0, 3).join(' ');
}

// ---- Caching Helpers ----

async function saveRecommendationsToDB(scoredTracks: ScoredTrack[]): Promise<void> {
  try {
    await clearRecommendations();
    for (const scored of scoredTracks) {
      const rec: Recommendation = {
        trackId: scored.track.id,
        track: scored.track,
        reason: scored.reason,
        score: scored.score,
        createdAt: Date.now(),
      };
      await addRecommendation(rec);
    }
  } catch (error) {
    console.error('Failed to save recommendations to DB:', error);
  }
}

async function getCachedRecommendations(): Promise<Track[]> {
  try {
    const recs = await getRecommendations(20);
    return recs.map((r) => r.track);
  } catch (error) {
    console.error('Failed to get cached recommendations:', error);
    return [];
  }
}

// ---- Utility Functions ----

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}
