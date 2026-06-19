// ============================================================
// SAAVNIFY V4 - JioSaavn API Integration (FIXED)
// Uses the same public JioSaavn API that AirBeats web uses
// https://github.com/shnwazdeveloper/shnwazdev-jiosaavn-api
//
// Direct MP4 audio URLs, no auth, no proxy, no signature cipher.
// Works in browser (CORS enabled).
// ============================================================

import type { Track, Artist, Album, SearchResult, SourceType } from '@/types';

const SOURCE: SourceType = 'jiosaavn';

// Public JioSaavn API hosted on Vercel (same as AirBeats web)
const JIOSAAVN_API = 'https://shnwazdev-jiosaavn-apii.vercel.app/api';

// ---- Response Types ----

interface JioSaavnSearchResponse {
  success: boolean;
  data: {
    topQuery?: { results: JioSaavnSearchItem[] };
    songs?: { results: JioSaavnSearchItem[] };
    albums?: { results: JioSaavnSearchItem[] };
    artists?: { results: JioSaavnSearchItem[] };
    playlists?: { results: JioSaavnSearchItem[] };
  };
}

interface JioSaavnSearchItem {
  id: string;
  title: string;
  image: Array<{ quality: string; url: string }>;
  url?: string;
  type?: 'song' | 'album' | 'artist' | 'playlist';
  description?: string;
  album?: string;
  primaryArtists?: string;
  singers?: string;
  language?: string;
  duration?: number;
}

interface JioSaavnSongResponse {
  success: boolean;
  data: Array<{
    id: string;
    name: string;
    year?: string;
    duration?: number;
    language?: string;
    label?: string;
    url?: string;
    album?: { id: string; name: string; url?: string };
    artists?: {
      primary?: Array<{ id: string; name: string; image?: Array<{ url: string }> }>;
      all?: Array<{ id: string; name: string }>;
    };
    image: Array<{ quality: string; url: string }>;
    downloadUrl: Array<{ quality: string; url: string }>;
  }>;
}

// ---- Helpers ----

function decodeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function getBestImage(images: Array<{ quality: string; url: string }>): string {
  if (!images || images.length === 0) return '';
  // Prefer 500x500, then 150x150, then any
  const preferred = ['500x500', '150x150', '50x50'];
  for (const q of preferred) {
    const img = images.find((i) => i.quality === q);
    if (img) return img.url;
  }
  return images[0].url;
}

function mapSearchItemToTrack(item: JioSaavnSearchItem): Track {
  return {
    id: `js-${item.id}`,
    videoId: item.id,
    title: decodeHtml(item.title),
    artist: decodeHtml(item.primaryArtists || item.singers || item.description || 'Unknown Artist'),
    thumbnail: getBestImage(item.image),
    duration: item.duration || 0,
    channelTitle: decodeHtml(item.primaryArtists || item.singers || 'Unknown Artist'),
    album: item.album ? decodeHtml(item.album) : undefined,
    language: item.language,
    addedAt: Date.now(),
    source: SOURCE,
    permalink: item.url,
    // streamUrl will be resolved lazily via getJioSaavnStreamUrl()
  };
}

function mapSearchItemToArtist(item: JioSaavnSearchItem): Artist {
  return {
    id: `jsa-${item.id}`,
    channelId: item.id,
    name: decodeHtml(item.title),
    thumbnail: getBestImage(item.image),
    description: item.description,
  };
}

function mapSearchItemToAlbum(item: JioSaavnSearchItem): Album {
  return {
    id: `jsal-${item.id}`,
    playlistId: item.id,
    title: decodeHtml(item.title),
    artist: decodeHtml(item.primaryArtists || item.description || 'Unknown'),
    thumbnail: getBestImage(item.image),
  };
}

// ---- HTTP helper ----

async function jiosaavnFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  try {
    const url = new URL(`${JIOSAAVN_API}/${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`JioSaavn API error: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`JioSaavn fetch failed (${path}):`, error);
    return null;
  }
}

// ============================================================
// PUBLIC API — Search
// ============================================================

export async function searchJioSaavn(
  query: string,
  maxResults: number = 20
): Promise<SearchResult> {
  const data = await jiosaavnFetch<JioSaavnSearchResponse>('search', {
    query,
    limit: String(maxResults),
  });

  if (!data?.success || !data.data) {
    return { tracks: [], artists: [], albums: [], playlists: [] };
  }

  const tracks: Track[] = (data.data.songs?.results || [])
    .slice(0, maxResults)
    .map(mapSearchItemToTrack);

  const artists: Artist[] = (data.data.artists?.results || [])
    .slice(0, 10)
    .map(mapSearchItemToArtist);

  const albums: Album[] = (data.data.albums?.results || [])
    .slice(0, 10)
    .map(mapSearchItemToAlbum);

  return { tracks, artists, albums, playlists: [] };
}

// ============================================================
// PUBLIC API — Stream URL Resolution
// Returns direct MP4 audio URL — works with HTML5 Audio.
// ============================================================

export async function getJioSaavnStreamUrl(songId: string): Promise<string | null> {
  const data = await jiosaavnFetch<JioSaavnSongResponse>('songs', { id: songId });

  if (!data?.success || !data.data || data.data.length === 0) {
    return null;
  }

  const song = data.data[0];
  const downloadUrls = song.downloadUrl || [];

  if (downloadUrls.length === 0) return null;

  // Prefer 320 kbps, then 160, then 96, then any
  const preferredBitrates = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
  for (const bitrate of preferredBitrates) {
    const stream = downloadUrls.find((d) => d.quality === bitrate);
    if (stream?.url) return stream.url;
  }

  return downloadUrls[0]?.url || null;
}

// ============================================================
// PUBLIC API — Song Details
// ============================================================

export async function getJioSaavnSongDetails(songId: string): Promise<Track | null> {
  const data = await jiosaavnFetch<JioSaavnSongResponse>('songs', { id: songId });

  if (!data?.success || !data.data || data.data.length === 0) {
    return null;
  }

  const song = data.data[0];
  const streamUrl = (song.downloadUrl || []).find((d) => d.quality === '320kbps')?.url ||
    (song.downloadUrl || []).find((d) => d.quality === '160kbps')?.url ||
    (song.downloadUrl || [])[0]?.url ||
    undefined;

  return {
    id: `js-${song.id}`,
    videoId: song.id,
    title: decodeHtml(song.name),
    artist: decodeHtml(
      song.artists?.primary?.map((a) => a.name).join(', ') ||
      song.artists?.all?.map((a) => a.name).join(', ') ||
      'Unknown Artist'
    ),
    thumbnail: getBestImage(song.image),
    duration: song.duration || 0,
    channelTitle: decodeHtml(
      song.artists?.primary?.[0]?.name || 'Unknown Artist'
    ),
    addedAt: Date.now(),
    source: SOURCE,
    streamUrl,
    album: song.album?.name ? decodeHtml(song.album.name) : undefined,
    language: song.language,
    year: song.year,
    permalink: song.url,
  };
}

// ============================================================
// PUBLIC API — Trending / Home Feed
// ============================================================

export async function getJioSaavnTrending(limit: number = 20): Promise<Track[]> {
  // JioSaavn API doesn't have a dedicated trending endpoint,
  // so we search for "top hindi songs" which returns current popular tracks
  const result = await searchJioSaavn('top hindi songs 2025', limit);
  return result.tracks;
}

// ============================================================
// PUBLIC API — Category Search
// ============================================================

export async function searchJioSaavnByCategory(
  category: string,
  _limit: number = 20
): Promise<Track[]> {
  // Map internal category names to JioSaavn-friendly queries
  const categoryQueries: Record<string, string> = {
    bollywood: 'bollywood hits latest',
    punjabi: 'punjabi hits latest',
    hindiRomantic: 'hindi romantic songs',
    lofi: 'lofi hindi songs',
    workout: 'workout hindi punjabi',
    devotional: 'bhakti devotional hindi',
    party: 'party songs bollywood',
    ghazal: 'ghazal urdu hindi',
    classical: 'indian classical music',
    remix: 'hindi remix dj songs',
    retro: 'old hindi songs bollywood',
    indie: 'indie india music',
    tamil: 'tamil hits latest',
    telugu: 'telugu hits latest',
    marathi: 'marathi hits songs',
    bengali: 'bengali hits songs',
    haryanvi: 'haryanvi hits songs',
    bhojpuri: 'bhojpuri hits songs',
    gujarati: 'gujarati hits songs',
    kannada: 'kannada hits latest',
    malayalam: 'malayalam hits latest',
  };

  const query = categoryQueries[category] || `${category} songs`;
  const result = await searchJioSaavn(query);
  return result.tracks;
}

// ============================================================
// PUBLIC API — Top Artists
// ============================================================

export async function getJioSaavnTopArtists(): Promise<Artist[]> {
  const queries = [
    'Arijit Singh',
    'Pritam',
    'Shreya Ghoshal',
    'Neha Kakkar',
    'Badshah',
    'Guru Randhawa',
    'Sonu Nigam',
    'Atif Aslam',
    'AP Dhillon',
    'Vishal Shekhar',
  ];

  const artists: Artist[] = [];

  for (const query of queries) {
    try {
      const data = await jiosaavnFetch<JioSaavnSearchResponse>('search', { query });
      if (data?.success) {
        const artistResult = data.data?.artists?.results?.[0];
        if (artistResult) {
          artists.push(mapSearchItemToArtist(artistResult));
        }
      }
    } catch {
      // Skip on error
    }
    if (artists.length >= 10) break;
  }

  return artists;
}

// ============================================================
// PUBLIC API — Health Check
// ============================================================

export async function isJioSaavnAvailable(): Promise<boolean> {
  try {
    const data = await jiosaavnFetch<JioSaavnSearchResponse>('search', {
      query: 'test',
      limit: '1',
    });
    return !!(data?.success);
  } catch {
    return false;
  }
}
