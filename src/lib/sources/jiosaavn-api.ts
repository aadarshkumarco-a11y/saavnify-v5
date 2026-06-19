// ============================================================
// SAAVNIFY V4 - JioSaavn API Integration
// PRIMARY music source - no API key required
// Strongest Indian music catalog: Bollywood, Hindi, Punjabi,
// Tamil, Telugu, Malayalam, Kannada, Bhojpuri, Marathi,
// Gujarati, Bengali, Devotional, Lo-Fi India
// ============================================================

import type { Track, Artist, Album, SearchResult, SourceType } from '@/types';

const SOURCE: SourceType = 'jiosaavn';

// JioSaavn API endpoints
const JIOSAAVN_API = 'https://www.jiosaavn.com/api.php';
const JIOSAAVN_SEARCH = 'https://www.jiosaavn.com/api.php?__call=autocomplete.get';

// ---- JioSaavn Response Interfaces ----

interface JioSaavnSearchResult {
  songs?: { data: JioSaavnSong[] };
  artists?: { data: JioSaavnArtist[] };
  albums?: { data: JioSaavnAlbum[] };
  playlists?: { data: JioSaavnPlaylist[] };
}

interface JioSaavnSong {
  id: string;
  title: string;
  subtitle: string;
  header_desc?: string;
  image: string;
  perma_url: string;
  more_info: {
    vlink?: string;
    duration?: string;
    album?: string;
    primary_artists?: string;
    language?: string;
    year?: string;
    encrypted_media_url?: string;
    media_url?: string;
  };
}

interface JioSaavnArtist {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  perma_url: string;
  description?: string;
}

interface JioSaavnAlbum {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  perma_url: string;
  more_info?: {
    song_count?: string;
    artist?: string;
  };
}

interface JioSaavnPlaylist {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  perma_url: string;
}

interface JioSaavnSongDetail {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  perma_url: string;
  media_url: string;
  duration: string;
  album?: string;
  primary_artists?: string;
  language?: string;
  year?: string;
  encrypted_media_url?: string;
}

// ---- Indian Languages supported by JioSaavn ----

export const INDIAN_LANGUAGES = [
  'hindi', 'punjabi', 'tamil', 'telugu', 'malayalam',
  'kannada', 'bhojpuri', 'marathi', 'gujarati', 'bengali',
  'urdu', 'assamese', 'odia', 'rajasthani', 'haryanvi',
] as const;

export type IndianLanguage = typeof INDIAN_LANGUAGES[number];

// ---- Indian Music Categories ----

export const INDIAN_CATEGORIES = {
  bollywood: { query: 'bollywood hits', language: 'hindi' },
  punjabi: { query: 'punjabi hits', language: 'punjabi' },
  hindiRomantic: { query: 'hindi romantic songs', language: 'hindi' },
  lofi: { query: 'lofi india', language: 'hindi' },
  workout: { query: 'workout music india', language: 'hindi' },
  devotional: { query: 'devotional songs', language: 'hindi' },
  party: { query: 'party songs hindi', language: 'hindi' },
  ghazal: { query: 'ghazal', language: 'urdu' },
  classical: { query: 'indian classical', language: 'hindi' },
  remix: { query: 'hindi remix', language: 'hindi' },
  retro: { query: 'retro hindi songs', language: 'hindi' },
  indie: { query: 'indie india', language: 'hindi' },
  tamil: { query: 'tamil hits', language: 'tamil' },
  telugu: { query: 'telugu hits', language: 'telugu' },
  marathi: { query: 'marathi songs', language: 'marathi' },
  bengali: { query: 'bengali songs', language: 'bengali' },
  haryanvi: { query: 'haryanvi songs', language: 'haryanvi' },
  bhojpuri: { query: 'bhojpuri songs', language: 'bhojpuri' },
  gujarati: { query: 'gujarati songs', language: 'gujarati' },
  kannada: { query: 'kannada hits', language: 'kannada' },
  malayalam: { query: 'malayalam hits', language: 'malayalam' },
} as const;

// ---- Default Indian Artists ----

export const DEFAULT_INDIAN_ARTISTS: Artist[] = [
  { id: 'jsa-1', channelId: 'arijit-singh', name: 'Arijit Singh', thumbnail: '' },
  { id: 'jsa-2', channelId: 'pritam', name: 'Pritam', thumbnail: '' },
  { id: 'jsa-3', channelId: 'ap-dhillon', name: 'AP Dhillon', thumbnail: '' },
  { id: 'jsa-4', channelId: 'shreya-ghoshal', name: 'Shreya Ghoshal', thumbnail: '' },
  { id: 'jsa-5', channelId: 'vishal-shekhar', name: 'Vishal-Shekhar', thumbnail: '' },
  { id: 'jsa-6', channelId: 'sonu-nigam', name: 'Sonu Nigam', thumbnail: '' },
  { id: 'jsa-7', channelId: 'neha-kakkar', name: 'Neha Kakkar', thumbnail: '' },
  { id: 'jsa-8', channelId: 'badshah', name: 'Badshah', thumbnail: '' },
  { id: 'jsa-9', channelId: 'guru-randhawa', name: 'Guru Randhawa', thumbnail: '' },
  { id: 'jsa-10', channelId: 'atif-aslam', name: 'Atif Aslam', thumbnail: '' },
];

// ---- Helper: Decode JioSaavn image URL ----

function decodeImageUrl(url: string): string {
  if (!url) return '';
  try {
    return url
      .replace('150x150', '500x500')
      .replace('50x50', '500x500')
      .replace('100x100', '500x500');
  } catch {
    return url;
  }
}

// ---- Helper: Decode JioSaavn encrypted media URL ----

function decodeMediaUrl(encryptedUrl: string): string {
  if (!encryptedUrl) return '';
  try {
    if (encryptedUrl.startsWith('http')) return encryptedUrl;

    // Try base64 decode
    try {
      const url = atob(encryptedUrl);
      if (url.startsWith('http')) return url;
    } catch {
      // Not base64
    }

    // Character substitution cipher (known JioSaavn pattern)
    const map: Record<string, string> = {
      '\u003d': '',
    };
    let result = encryptedUrl;
    for (const [from, to] of Object.entries(map)) {
      result = result.replaceAll(from, to);
    }
    return result;
  } catch {
    return encryptedUrl;
  }
}

// ---- Helper: Clean title text ----

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

// ---- Helper: Map JioSaavn song to Track ----

function mapSongToTrack(song: JioSaavnSong): Track {
  const videoId = song.more_info?.vlink || song.id;
  const streamUrl = song.more_info?.media_url
    ? decodeMediaUrl(song.more_info.media_url)
    : song.more_info?.encrypted_media_url
      ? decodeMediaUrl(song.more_info.encrypted_media_url)
      : '';

  return {
    id: `js-${song.id}`,
    videoId,
    title: cleanText(song.title),
    artist: cleanText(song.subtitle || song.more_info?.primary_artists || 'Unknown'),
    thumbnail: decodeImageUrl(song.image),
    duration: song.more_info?.duration ? parseInt(song.more_info.duration, 10) : 0,
    channelTitle: cleanText(song.subtitle || song.more_info?.primary_artists || 'Unknown'),
    addedAt: Date.now(),
    source: SOURCE,
    streamUrl,
    album: song.more_info?.album ? cleanText(song.more_info.album) : undefined,
    language: song.more_info?.language,
    year: song.more_info?.year,
    permalink: song.perma_url,
  };
}

// ---- Helper: Map JioSaavn artist to Artist ----

function mapArtist(artist: JioSaavnArtist): Artist {
  return {
    id: `jsa-${artist.id}`,
    channelId: artist.id,
    name: cleanText(artist.title),
    thumbnail: decodeImageUrl(artist.image),
    description: artist.description,
  };
}

// ---- Helper: Map JioSaavn album to Album ----

function mapAlbum(album: JioSaavnAlbum): Album {
  return {
    id: `jsal-${album.id}`,
    playlistId: album.id,
    title: cleanText(album.title),
    artist: cleanText(album.subtitle || album.more_info?.artist || 'Various'),
    thumbnail: decodeImageUrl(album.image),
    trackCount: album.more_info?.song_count ? parseInt(album.more_info.song_count, 10) : undefined,
  };
}

// ---- Main Search Function ----

export async function searchJioSaavn(query: string, maxResults: number = 20): Promise<SearchResult> {
  try {
    const url = new URL(JIOSAAVN_SEARCH);
    url.searchParams.set('_format', 'json');
    url.searchParams.set('_marker', '0');
    url.searchParams.set('cc', 'in');
    url.searchParams.set('includeMetaTags', '0');
    url.searchParams.set('query', query);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`JioSaavn API error: ${response.status}`);
    }

    const data: JioSaavnSearchResult = await response.json();

    const tracks: Track[] = (data.songs?.data || [])
      .slice(0, maxResults)
      .map(mapSongToTrack);

    const artists: Artist[] = (data.artists?.data || [])
      .slice(0, 10)
      .map(mapArtist);

    const albums: Album[] = (data.albums?.data || [])
      .slice(0, 10)
      .map(mapAlbum);

    return { tracks, artists, albums, playlists: [] };
  } catch (error) {
    console.error('JioSaavn search failed:', error);
    return { tracks: [], artists: [], albums: [], playlists: [] };
  }
}

// ---- Get Trending / Charts (Indian content focus) ----

export async function getJioSaavnTrending(limit: number = 20): Promise<Track[]> {
  try {
    // Try the featured content endpoint with Indian languages
    const url = new URL(JIOSAAVN_API);
    url.searchParams.set('__call', 'content.getFeatured');
    url.searchParams.set('_format', 'json');
    url.searchParams.set('_marker', '0');
    url.searchParams.set('language', 'hindi,english,punjabi,tamil,telugu');
    url.searchParams.set('api_version', '4');

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) throw new Error(`JioSaavn trending error: ${response.status}`);

    const data = await response.json();
    const songs: Track[] = [];

    // Extract songs from featured content
    if (data?.featured?.items) {
      for (const item of data.featured.items.slice(0, limit)) {
        if (item.list && Array.isArray(item.list)) {
          for (const song of item.list.slice(0, limit)) {
            if (song.title) {
              songs.push(mapSongToTrack(song as JioSaavnSong));
            }
          }
        }
      }
    }

    // Also try the trending endpoint
    if (songs.length === 0) {
      try {
        const trendingUrl = new URL(JIOSAAVN_API);
        trendingUrl.searchParams.set('__call', 'content.getTrending');
        trendingUrl.searchParams.set('_format', 'json');
        trendingUrl.searchParams.set('_marker', '0');
        trendingUrl.searchParams.set('language', 'hindi,punjabi');

        const trendRes = await fetch(trendingUrl.toString(), {
          headers: { 'Accept': 'application/json' },
        });

        if (trendRes.ok) {
          const trendData = await trendRes.json();
          if (trendData?.songs?.data) {
            for (const song of trendData.songs.data.slice(0, limit)) {
              songs.push(mapSongToTrack(song as JioSaavnSong));
            }
          }
        }
      } catch {
        // Ignore secondary endpoint failure
      }
    }

    // Fallback: search for trending Indian songs
    if (songs.length === 0) {
      const fallback = await searchJioSaavn('trending hits hindi 2025', limit);
      return fallback.tracks;
    }

    return songs.slice(0, limit);
  } catch (error) {
    console.error('JioSaavn trending failed:', error);
    try {
      const fallback = await searchJioSaavn('top hits hindi punjabi 2025', limit);
      return fallback.tracks;
    } catch {
      return [];
    }
  }
}

// ---- Indian Music Category Functions ----

/** Bollywood Hits */
export async function getJioSaavnBollywoodHits(limit: number = 20): Promise<Track[]> {
  const result = await searchJioSaavn('bollywood hits latest', limit);
  return result.tracks;
}

/** Punjabi Hits */
export async function getJioSaavnPunjabiHits(limit: number = 20): Promise<Track[]> {
  const result = await searchJioSaavn('punjabi hits latest', limit);
  return result.tracks;
}

/** Hindi Romantic Songs */
export async function getJioSaavnHindiRomantic(limit: number = 20): Promise<Track[]> {
  const result = await searchJioSaavn('hindi romantic songs', limit);
  return result.tracks;
}

/** Lo-Fi India */
export async function getJioSaavnLoFiIndia(limit: number = 20): Promise<Track[]> {
  const result = await searchJioSaavn('lofi india hindi', limit);
  return result.tracks;
}

/** Workout India */
export async function getJioSaavnWorkoutIndia(limit: number = 20): Promise<Track[]> {
  const result = await searchJioSaavn('workout music hindi punjabi', limit);
  return result.tracks;
}

/** Devotional Songs */
export async function getJioSaavnDevotional(limit: number = 20): Promise<Track[]> {
  const result = await searchJioSaavn('devotional songs bhakti', limit);
  return result.tracks;
}

/** New Releases India */
export async function getJioSaavnNewReleases(limit: number = 20): Promise<Track[]> {
  try {
    // Try the new releases endpoint
    const url = new URL(JIOSAAVN_API);
    url.searchParams.set('__call', 'content.getFeatured');
    url.searchParams.set('_format', 'json');
    url.searchParams.set('_marker', '0');
    url.searchParams.set('language', 'hindi,punjabi,tamil,telugu');
    url.searchParams.set('type', 'new');
    url.searchParams.set('api_version', '4');

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      const songs: Track[] = [];

      if (data?.new?.items || data?.featured?.items) {
        const items = data?.new?.items || data?.featured?.items;
        for (const item of items.slice(0, limit)) {
          if (item.list && Array.isArray(item.list)) {
            for (const song of item.list.slice(0, limit)) {
              if (song.title) {
                songs.push(mapSongToTrack(song as JioSaavnSong));
              }
            }
          }
        }
      }

      if (songs.length > 0) return songs.slice(0, limit);
    }
  } catch {
    // Fall through to search
  }

  // Fallback: search for new releases
  const result = await searchJioSaavn('new hindi punjabi songs 2025', limit);
  return result.tracks;
}

/** Top Indian Artists */
export async function getJioSaavnTopArtists(): Promise<Artist[]> {
  try {
    // Search for top Indian artists
    const result = await searchJioSaavn('top artists india', 15);
    if (result.artists.length > 0) {
      return result.artists;
    }
  } catch {
    // Fall through
  }

  // Return default Indian artists
  return DEFAULT_INDIAN_ARTISTS;
}

// ---- Get Song Details ----

export async function getJioSaavnSongDetails(songId: string): Promise<Track | null> {
  try {
    const url = new URL(JIOSAAVN_API);
    url.searchParams.set('__call', 'song.getDetails');
    url.searchParams.set('_format', 'json');
    url.searchParams.set('_marker', '0');
    url.searchParams.set('cc', 'in');
    url.searchParams.set('pids', songId);

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data?.[songId]) {
      const song = data[songId] as JioSaavnSongDetail;
      const streamUrl = song.media_url
        ? decodeMediaUrl(song.media_url)
        : song.encrypted_media_url
          ? decodeMediaUrl(song.encrypted_media_url)
          : '';

      return {
        id: `js-${song.id}`,
        videoId: song.id,
        title: cleanText(song.title),
        artist: cleanText(song.subtitle || song.primary_artists || 'Unknown'),
        thumbnail: decodeImageUrl(song.image),
        duration: song.duration ? parseInt(song.duration, 10) : 0,
        channelTitle: cleanText(song.subtitle || song.primary_artists || 'Unknown'),
        addedAt: Date.now(),
        source: SOURCE,
        streamUrl,
        album: song.album ? cleanText(song.album) : undefined,
        language: song.language,
        year: song.year,
        permalink: song.perma_url,
      };
    }

    return null;
  } catch (error) {
    console.error('JioSaavn song details failed:', error);
    return null;
  }
}

// ---- Search by Category/Mood ----

export async function searchJioSaavnByCategory(
  category: string,
  language: string = 'hindi'
): Promise<Track[]> {
  try {
    const result = await searchJioSaavn(`${category} ${language}`, 20);
    return result.tracks;
  } catch (error) {
    console.error('JioSaavn category search failed:', error);
    return [];
  }
}

// ---- Get Artist Top Songs ----

export async function getJioSaavnArtistSongs(artistId: string, limit: number = 20): Promise<Track[]> {
  try {
    const url = new URL(JIOSAAVN_API);
    url.searchParams.set('__call', 'artist.getArtistPageDetails');
    url.searchParams.set('_format', 'json');
    url.searchParams.set('_marker', '0');
    url.searchParams.set('artistId', artistId);
    url.searchParams.set('n_song', String(limit));

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();

    if (data?.topSongs?.songs) {
      return data.topSongs.songs.slice(0, limit).map((song: JioSaavnSong) => mapSongToTrack(song));
    }

    return [];
  } catch (error) {
    console.error('JioSaavn artist songs failed:', error);
    return [];
  }
}

// ---- Health Check ----

export async function isJioSaavnAvailable(): Promise<boolean> {
  try {
    const url = new URL(JIOSAAVN_API);
    url.searchParams.set('__call', 'content.getFeatured');
    url.searchParams.set('_format', 'json');
    url.searchParams.set('_marker', '0');
    url.searchParams.set('language', 'hindi');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
