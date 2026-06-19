// ============================================================
// SAAVNIFY V4 - Piped API Integration
// PRIMARY music source — free, no API key needed
// YouTube content via privacy-friendly proxy
// Direct audio stream URLs for ExoPlayer/HTML5 Audio
// Multi-instance rotation for reliability
// ============================================================

import type { Track, Artist, Album, SearchResult, SourceType } from '@/types';

const SOURCE: SourceType = 'piped';

// ---- Piped API Instances (multiple for reliability) ----

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.leptons.xyz',
];

let currentInstanceIndex = 0;
let instanceFailCounts: Record<string, number> = {};

// ---- Get current working instance ----

function getBaseUrl(): string {
  return PIPED_INSTANCES[currentInstanceIndex];
}

function rotateInstance(): string {
  // Try next instance
  currentInstanceIndex = (currentInstanceIndex + 1) % PIPED_INSTANCES.length;
  return PIPED_INSTANCES[currentInstanceIndex];
}

function markInstanceFailed(url: string): void {
  const key = url.replace('https://', '');
  instanceFailCounts[key] = (instanceFailCounts[key] || 0) + 1;

  // If failed 3+ times, try rotating
  if (instanceFailCounts[key] >= 3) {
    rotateInstance();
  }
}

function markInstanceSuccess(): void {
  const key = getBaseUrl().replace('https://', '');
  instanceFailCounts[key] = 0;
}

// ---- Piped API Response Types ----

interface PipedSearchResult {
  items: PipedSearchItem[];
  nextpage?: string;
  suggestion?: string;
  corrected?: boolean;
}

interface PipedSearchItem {
  url: string;
  type: 'stream' | 'channel' | 'playlist';
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  uploadedDate: string;
  shortDescription: string;
  duration: number;
  views: number;
  uploaded: number;
  uploaderVerified: boolean;
  isShort: boolean;
}

interface PipedStreamData {
  title: string;
  description: string;
  uploadDate: string;
  uploader: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  thumbnailUrl: string;
  hls: string;
  dash: string | null;
  lbryId: string | null;
  category: string;
  license: string;
  subCount: number;
  lengthSeconds: number;
  allowTrucking: boolean;
  audioStreams: PipedAudioStream[];
  videoStreams: PipedVideoStream[];
  relatedStreams: PipedRelatedStream[];
}

interface PipedAudioStream {
  url: string;
  format: string;
  quality: string;
  mimeType: string;
  codec: string;
  audioTrackId: string | null;
  audioTrackLocale: string | null;
  audioTrackTitle: string | null;
  videoOnly: boolean;
  bitrate: number;
  contentLength: number;
}

interface PipedVideoStream {
  url: string;
  format: string;
  quality: string;
  mimeType: string;
  codec: string;
  videoOnly: boolean;
  bitrate: number;
  contentLength: number;
  width: number;
  height: number;
  fps: number;
}

interface PipedRelatedStream {
  url: string;
  type: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  uploadedDate: string;
  duration: number;
  views: number;
  uploaded: number;
  uploaderVerified: boolean;
  isShort: boolean;
}

interface PipedTrendingResult {
  category: string;
  videos: PipedSearchItem[];
}

interface PipedChannelResult {
  name: string;
  thumbnailUrl: string;
  description: string;
  subscriberCount: number;
  relatedStreams: PipedRelatedStream[];
}

// ---- Helper: Fetch with instance rotation ----

async function pipedFetch(path: string, retries: number = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const baseUrl = getBaseUrl();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${baseUrl}${path}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Piped API error: ${response.status}`);
      }

      markInstanceSuccess();
      return response;
    } catch (error) {
      markInstanceFailed(baseUrl);

      if (attempt < retries) {
        rotateInstance();
        continue;
      }

      throw error;
    }
  }

  throw new Error('All Piped instances failed');
}

// ---- Helper: Extract video ID from Piped URL ----

function extractVideoId(url: string): string {
  // Piped URLs are like /watch?v=VIDEO_ID
  const match = url.match(/[?&]v=([^&]+)/);
  if (match) return match[1];
  // Or just the last segment
  return url.split('/').pop() || url;
}

// ---- Helper: Map Piped search item to Track ----

function mapPipedItemToTrack(item: PipedSearchItem): Track {
  const videoId = extractVideoId(item.url);
  return {
    id: `pp-${videoId}`,
    videoId,
    title: cleanText(item.title),
    artist: cleanText(item.uploaderName || 'Unknown'),
    thumbnail: item.thumbnail || '',
    duration: item.duration || 0,
    channelTitle: cleanText(item.uploaderName || 'Unknown'),
    viewCount: item.views ? String(item.views) : undefined,
    addedAt: Date.now(),
    source: SOURCE,
  };
}

// ---- Helper: Map Piped related stream to Track ----

function mapRelatedStreamToTrack(stream: PipedRelatedStream): Track {
  const videoId = extractVideoId(stream.url);
  return {
    id: `pp-${videoId}`,
    videoId,
    title: cleanText(stream.title),
    artist: cleanText(stream.uploaderName || 'Unknown'),
    thumbnail: stream.thumbnail || '',
    duration: stream.duration || 0,
    channelTitle: cleanText(stream.uploaderName || 'Unknown'),
    viewCount: stream.views ? String(stream.views) : undefined,
    addedAt: Date.now(),
    source: SOURCE,
  };
}

// ---- Helper: Map Piped channel to Artist ----

function mapChannelToArtist(item: PipedSearchItem | { name: string; thumbnailUrl: string; subscriberCount: number; description?: string }, url?: string): Artist {
  if ('subscriberCount' in item && 'thumbnailUrl' in item) {
    const channel = item as { name: string; thumbnailUrl: string; subscriberCount: number; description?: string };
    return {
      id: `ppa-${url || channel.name.toLowerCase().replace(/\s+/g, '-')}`,
      channelId: url ? extractVideoId(url) : channel.name.toLowerCase().replace(/\s+/g, '-'),
      name: cleanText(channel.name),
      thumbnail: channel.thumbnailUrl || '',
      subscriberCount: channel.subscriberCount ? String(channel.subscriberCount) : undefined,
      description: channel.description,
    };
  }

  const searchItem = item as PipedSearchItem;
  return {
    id: `ppa-${extractVideoId(searchItem.uploaderUrl || searchItem.url)}`,
    channelId: extractVideoId(searchItem.uploaderUrl || searchItem.url),
    name: cleanText(searchItem.uploaderName || searchItem.title),
    thumbnail: searchItem.uploaderAvatar || searchItem.thumbnail || '',
  };
}

// ---- Helper: Clean text ----

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

// ============================================================
// PUBLIC API — Search
// ============================================================

/**
 * Search music using Piped API.
 * Uses music_songs filter for best results.
 */
export async function searchPiped(query: string, maxResults: number = 20): Promise<SearchResult> {
  try {
    const response = await pipedFetch(
      `/search?q=${encodeURIComponent(query)}&filter=music_songs`
    );

    const data: PipedSearchResult = await response.json();

    const tracks: Track[] = (data.items || [])
      .filter((item) => item.type === 'stream')
      .slice(0, maxResults)
      .map(mapPipedItemToTrack);

    // Also get channel results for artists
    let artists: Artist[] = [];
    try {
      const channelResponse = await pipedFetch(
        `/search?q=${encodeURIComponent(query)}&filter=channels`
      );
      const channelData: PipedSearchResult = await channelResponse.json();
      artists = (channelData.items || [])
        .filter((item) => item.type === 'channel')
        .slice(0, 10)
        .map((item) => mapChannelToArtist(item));
    } catch {
      // Channel search failed, continue with just tracks
    }

    // Also get playlist results for albums
    let albums: Album[] = [];
    try {
      const playlistResponse = await pipedFetch(
        `/search?q=${encodeURIComponent(query)}&filter=playlists`
      );
      const playlistData: PipedSearchResult = await playlistResponse.json();
      albums = (playlistData.items || [])
        .filter((item) => item.type === 'playlist')
        .slice(0, 10)
        .map((item) => ({
          id: `ppal-${extractVideoId(item.url)}`,
          playlistId: extractVideoId(item.url),
          title: cleanText(item.title),
          artist: cleanText(item.uploaderName || 'Various'),
          thumbnail: item.thumbnail || '',
        }));
    } catch {
      // Playlist search failed, continue
    }

    return { tracks, artists, albums, playlists: [] };
  } catch (error) {
    console.error('Piped search failed:', error);

    // Fallback: try general search (no filter) as last resort
    try {
      const response = await pipedFetch(
        `/search?q=${encodeURIComponent(query)}`
      );
      const data: PipedSearchResult = await response.json();

      const tracks: Track[] = (data.items || [])
        .filter((item) => item.type === 'stream' && item.duration > 0)
        .slice(0, maxResults)
        .map(mapPipedItemToTrack);

      const artists: Artist[] = (data.items || [])
        .filter((item) => item.type === 'channel')
        .slice(0, 10)
        .map((item) => mapChannelToArtist(item));

      return { tracks, artists, albums: [], playlists: [] };
    } catch {
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  }
}

// ============================================================
// PUBLIC API — Stream URL Resolution
// ============================================================

/**
 * Get the best audio stream URL for a video.
 * Returns the highest quality audio stream URL.
 */
export async function getPipedStreamUrl(videoId: string): Promise<string | null> {
  try {
    const response = await pipedFetch(`/streams/${videoId}`);
    const data: PipedStreamData = await response.json();

    if (!data.audioStreams || data.audioStreams.length === 0) {
      // Try HLS if available
      if (data.hls) return data.hls;
      return null;
    }

    // Sort by bitrate (highest first), prefer opus/webm for quality
    const sortedStreams = [...data.audioStreams]
      .filter((s) => s.url && s.mimeType)
      .sort((a, b) => {
        // Prefer opus codec for quality
        const aIsOpus = a.mimeType?.includes('opus') || a.codec?.includes('opus');
        const bIsOpus = b.mimeType?.includes('opus') || b.codec?.includes('opus');
        if (aIsOpus && !bIsOpus) return -1;
        if (!aIsOpus && bIsOpus) return 1;
        // Then by bitrate
        return (b.bitrate || 0) - (a.bitrate || 0);
      });

    if (sortedStreams.length > 0) {
      return sortedStreams[0].url;
    }

    // Fallback to HLS
    if (data.hls) return data.hls;

    return null;
  } catch (error) {
    console.error('Piped stream resolution failed:', error);
    return null;
  }
}

// ============================================================
// PUBLIC API — Trending
// ============================================================

/**
 * Get trending music for India region.
 */
export async function getPipedTrending(region: string = 'IN', limit: number = 20): Promise<Track[]> {
  try {
    const response = await pipedFetch(`/trending?region=${region}`);
    const data: PipedTrendingResult = await response.json();

    const tracks = (data.videos || [])
      .filter((v) => v.type === 'stream' && v.duration > 0)
      .slice(0, limit)
      .map(mapPipedItemToTrack);

    return tracks;
  } catch (error) {
    console.error('Piped trending failed:', error);
    return [];
  }
}

// ============================================================
// PUBLIC API — Category / Mood Search
// ============================================================

/** Indian music categories with search queries optimized for Piped/YouTube */
export const INDIAN_CATEGORIES = {
  bollywood: { query: 'bollywood hits hindi songs', label: 'Bollywood Hits' },
  punjabi: { query: 'punjabi hits songs', label: 'Punjabi Hits' },
  hindiRomantic: { query: 'hindi romantic songs bollywood', label: 'Hindi Romantic' },
  lofi: { query: 'lofi india hindi remix', label: 'Lo-Fi India' },
  workout: { query: 'workout music hindi punjabi gym', label: 'Workout India' },
  devotional: { query: 'devotional songs bhakti hindi', label: 'Devotional' },
  party: { query: 'party songs hindi bollywood', label: 'Party Hits' },
  ghazal: { query: 'ghazal urdu hindi', label: 'Ghazal' },
  classical: { query: 'indian classical music raga', label: 'Indian Classical' },
  remix: { query: 'hindi remix songs bollywood dj', label: 'Remix' },
  retro: { query: 'retro hindi songs old bollywood', label: 'Retro' },
  indie: { query: 'indie india music alternative', label: 'Indie India' },
  tamil: { query: 'tamil hits songs kollywood', label: 'Tamil Hits' },
  telugu: { query: 'telugu hits songs tollywood', label: 'Telugu Hits' },
  marathi: { query: 'marathi songs hits', label: 'Marathi' },
  bengali: { query: 'bengali songs hits', label: 'Bengali' },
  haryanvi: { query: 'haryanvi songs hits', label: 'Haryanvi' },
  bhojpuri: { query: 'bhojpuri songs hits', label: 'Bhojpuri' },
  gujarati: { query: 'gujarati songs hits', label: 'Gujarati' },
  kannada: { query: 'kannada hits songs sandalwood', label: 'Kannada' },
  malayalam: { query: 'malayalam hits songs mollywood', label: 'Malayalam' },
} as const;

/**
 * Search music by Indian category/mood.
 */
export async function searchPipedByCategory(category: string, limit: number = 20): Promise<Track[]> {
  const cat = INDIAN_CATEGORIES[category as keyof typeof INDIAN_CATEGORIES];
  const query = cat?.query || `${category} hindi songs`;

  try {
    const result = await searchPiped(query, limit);
    return result.tracks;
  } catch (error) {
    console.error('Piped category search failed:', error);
    return [];
  }
}

// ============================================================
// PUBLIC API — Related / More Like This
// ============================================================

/**
 * Get related tracks for a given video ID.
 */
export async function getPipedRelated(videoId: string, limit: number = 15): Promise<Track[]> {
  try {
    const response = await pipedFetch(`/streams/${videoId}`);
    const data: PipedStreamData = await response.json();

    return (data.relatedStreams || [])
      .filter((s) => s.type === 'stream' && s.duration > 0)
      .slice(0, limit)
      .map(mapRelatedStreamToTrack);
  } catch (error) {
    console.error('Piped related failed:', error);
    return [];
  }
}

// ============================================================
// PUBLIC API — Channel / Artist Details
// ============================================================

/**
 * Get artist/channel details and top songs.
 */
export async function getPipedChannel(channelId: string, limit: number = 20): Promise<{ artist: Artist; tracks: Track[] }> {
  try {
    const response = await pipedFetch(`/channel/${channelId}`);
    const data: PipedChannelResult = await response.json();

    const artist: Artist = {
      id: `ppa-${channelId}`,
      channelId,
      name: cleanText(data.name),
      thumbnail: data.thumbnailUrl || '',
      subscriberCount: data.subscriberCount ? String(data.subscriberCount) : undefined,
      description: data.description,
    };

    const tracks: Track[] = (data.relatedStreams || [])
      .filter((s) => s.type === 'stream' && s.duration > 0)
      .slice(0, limit)
      .map(mapRelatedStreamToTrack);

    return { artist, tracks };
  } catch (error) {
    console.error('Piped channel failed:', error);
    return {
      artist: { id: `ppa-${channelId}`, channelId, name: channelId, thumbnail: '' },
      tracks: [],
    };
  }
}

// ============================================================
// PUBLIC API — Top Indian Artists
// ============================================================

export const DEFAULT_INDIAN_ARTISTS: Artist[] = [
  { id: 'ppa-arijit-singh', channelId: 'UCy3OmMg3dFGpJ8L5BP9N-5g', name: 'Arijit Singh', thumbnail: '' },
  { id: 'ppa-pritam', channelId: 'UCm4L0aMdH7M6AHU0fEFfLtg', name: 'Pritam', thumbnail: '' },
  { id: 'ppa-ap-dhillon', channelId: 'UC_wGGKfR8-mKnJGG8W4B5KQ', name: 'AP Dhillon', thumbnail: '' },
  { id: 'ppa-shreya-ghoshal', channelId: 'UCU5M98pfOdrl1gdYHBXg5uA', name: 'Shreya Ghoshal', thumbnail: '' },
  { id: 'ppa-vishal-shekhar', channelId: 'UCnSzKqdR8LjjmfMCbH7o9ww', name: 'Vishal-Shekhar', thumbnail: '' },
  { id: 'ppa-sonu-nigam', channelId: 'UC2tP1AH0P6aStL8idHk-b4w', name: 'Sonu Nigam', thumbnail: '' },
  { id: 'ppa-neha-kakkar', channelId: 'UCuNPuDGLsQmCRjW7ZNMEBLQ', name: 'Neha Kakkar', thumbnail: '' },
  { id: 'ppa-badshah', channelId: 'UCxrGa8UaG7Uf-5s0AIqPcMQ', name: 'Badshah', thumbnail: '' },
  { id: 'ppa-guru-randhawa', channelId: 'UC10D7TiQqZpJm6i8Fd1ZnOQ', name: 'Guru Randhawa', thumbnail: '' },
  { id: 'ppa-atif-aslam', channelId: 'UCUhMl5Sjuea8Cp5s7wt2UBg', name: 'Atif Aslam', thumbnail: '' },
];

/**
 * Get top Indian artists by searching for their channels.
 */
export async function getPipedTopArtists(): Promise<Artist[]> {
  try {
    const artistQueries = [
      'Arijit Singh',
      'Pritam',
      'AP Dhillon',
      'Shreya Ghoshal',
      'Neha Kakkar',
      'Badshah',
      'Guru Randhawa',
      'Sonu Nigam',
      'Atif Aslam',
      'Vishal Shekhar',
    ];

    // Search for each artist's channel
    const artists: Artist[] = [];

    // Only search first 5 to avoid too many API calls
    for (const query of artistQueries.slice(0, 5)) {
      try {
        const response = await pipedFetch(
          `/search?q=${encodeURIComponent(query)}&filter=channels`
        );
        const data: PipedSearchResult = await response.json();

        if (data.items && data.items.length > 0) {
          const channel = data.items[0];
          artists.push({
            id: `ppa-${extractVideoId(channel.uploaderUrl || channel.url)}`,
            channelId: extractVideoId(channel.uploaderUrl || channel.url),
            name: cleanText(channel.uploaderName || channel.title),
            thumbnail: channel.uploaderAvatar || channel.thumbnail || '',
          });
        }
      } catch {
        // Skip this artist if search fails
      }
    }

    // Fill remaining with defaults
    while (artists.length < 10) {
      const defaultArtist = DEFAULT_INDIAN_ARTISTS[artists.length];
      if (defaultArtist) {
        artists.push(defaultArtist);
      } else {
        break;
      }
    }

    return artists;
  } catch (error) {
    console.error('Piped top artists failed:', error);
    return DEFAULT_INDIAN_ARTISTS;
  }
}

// ============================================================
// PUBLIC API — Health Check
// ============================================================

/**
 * Check if Piped API is available.
 */
export async function isPipedAvailable(): Promise<boolean> {
  try {
    const response = await pipedFetch('/trending?region=IN');
    const data = await response.json();
    return !!(data && (data.videos || data.items));
  } catch {
    return false;
  }
}

// ============================================================
// PUBLIC API — Search Suggestions
// ============================================================

/**
 * Get search suggestions for a query.
 */
export async function getPipedSuggestions(query: string): Promise<string[]> {
  try {
    const response = await pipedFetch(`/suggestions?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
