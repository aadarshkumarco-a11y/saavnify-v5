// ============================================================
// SAAVNIFY V4 - Open Source Music Providers
// Secondary source: Jamendo + Audius
// Free, legal, Creative Commons licensed music
// ============================================================

import type { Track, Artist, SearchResult, SourceType } from '@/types';

// ---- Jamendo API ----

const JAMENDO_CLIENT_ID = '2e4e6e6e'; // Free public client ID for non-commercial use
const JAMENDO_API = 'https://api.jamendo.com/v3.0';

interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  artist_id: string;
  album_name: string;
  album_id: string;
  duration: number;
  image: string;
  audio: string;
  audiodownload: string;
  shorturl: string;
  musicinfo?: {
    tags?: { genres?: string[]; instruments?: string[]; moods?: string[] };
  };
}

interface JamendoArtist {
  id: string;
  name: string;
  image: string;
  shorturl: string;
  musicinfo?: { tags?: { genres?: string[] } };
}

interface JamendoResponse<T> {
  headers: { status: string; code: number };
  results: T[];
}

// ---- Audius API ----

const AUDIUS_APP_NAME = 'SAAVNIFY';

interface AudiusTrack {
  id: string;
  title: string;
  user: { name: string; id: string; handle: string };
  duration: number;
  artwork?: { '150x150'?: string; '480x480'?: string; '1000x1000'?: string };
  genre: string;
  mood?: string;
  permalink?: string;
}

interface AudiusSearchResponse {
  data: AudiusTrack[];
}

// ---- Helper Functions ----

function mapJamendoTrack(track: JamendoTrack): Track {
  return {
    id: `jm-${track.id}`,
    videoId: track.id,
    title: track.name,
    artist: track.artist_name,
    thumbnail: track.image || '',
    duration: track.duration,
    channelTitle: track.artist_name,
    addedAt: Date.now(),
    source: 'jamendo' as SourceType,
    streamUrl: track.audio || track.audiodownload,
    album: track.album_name,
    permalink: track.shorturl,
  };
}

function mapAudiusTrack(track: AudiusTrack): Track {
  const thumbnail =
    track.artwork?.['1000x1000'] ||
    track.artwork?.['480x480'] ||
    track.artwork?.['150x150'] ||
    '';

  return {
    id: `au-${track.id}`,
    videoId: track.id,
    title: track.title,
    artist: track.user.name,
    thumbnail,
    duration: Math.round(track.duration),
    channelTitle: track.user.name,
    addedAt: Date.now(),
    source: 'audius' as SourceType,
    streamUrl: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=${AUDIUS_APP_NAME}`,
    permalink: track.permalink,
  };
}

// ---- Get Audius Discovery Node ----

let cachedAudiusNode: string | null = null;

async function getAudiusNode(): Promise<string> {
  if (cachedAudiusNode) return cachedAudiusNode;

  try {
    const response = await fetch('https://api.audius.co', {
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    // data is an array of node URLs
    if (Array.isArray(data) && data.length > 0) {
      // Pick a random node for load balancing
      cachedAudiusNode = data[Math.floor(Math.random() * data.length)];
      return cachedAudiusNode;
    }
  } catch {
    // Fallback to known node
  }

  cachedAudiusNode = 'https://discoveryprovider.audius.co';
  return cachedAudiusNode;
}

// ---- Jamendo Search ----

export async function searchJamendo(query: string, limit: number = 20): Promise<Track[]> {
  try {
    const url = new URL(`${JAMENDO_API}/tracks`);
    url.searchParams.set('client_id', JAMENDO_CLIENT_ID);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('search', query);
    url.searchParams.set('include', 'musicinfo');
    url.searchParams.set('groupby', 'artist_id');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data: JamendoResponse<JamendoTrack> = await response.json();
    return (data.results || []).map(mapJamendoTrack);
  } catch (error) {
    console.error('Jamendo search failed:', error);
    return [];
  }
}

// ---- Jamendo Popular/Trending ----

export async function getJamendoPopular(limit: number = 20): Promise<Track[]> {
  try {
    const url = new URL(`${JAMENDO_API}/tracks`);
    url.searchParams.set('client_id', JAMENDO_CLIENT_ID);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('order', 'popularity_total');
    url.searchParams.set('include', 'musicinfo');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data: JamendoResponse<JamendoTrack> = await response.json();
    return (data.results || []).map(mapJamendoTrack);
  } catch (error) {
    console.error('Jamendo popular failed:', error);
    return [];
  }
}

// ---- Jamendo by Mood/Tag ----

export async function getJamendoByTag(tag: string, limit: number = 20): Promise<Track[]> {
  try {
    const url = new URL(`${JAMENDO_API}/tracks`);
    url.searchParams.set('client_id', JAMENDO_CLIENT_ID);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('tags', tag);
    url.searchParams.set('order', 'popularity_total');
    url.searchParams.set('include', 'musicinfo');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data: JamendoResponse<JamendoTrack> = await response.json();
    return (data.results || []).map(mapJamendoTrack);
  } catch (error) {
    console.error('Jamendo tag search failed:', error);
    return [];
  }
}

// ---- Audius Search ----

export async function searchAudius(query: string, limit: number = 20): Promise<Track[]> {
  try {
    const node = await getAudiusNode();
    const url = `${node}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}&app_name=${AUDIUS_APP_NAME}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data: AudiusSearchResponse = await response.json();
    return (data.data || []).map(mapAudiusTrack);
  } catch (error) {
    console.error('Audius search failed:', error);
    return [];
  }
}

// ---- Audius Trending ----

export async function getAudiusTrending(limit: number = 20): Promise<Track[]> {
  try {
    const node = await getAudiusNode();
    const url = `${node}/v1/tracks/trending?limit=${limit}&app_name=${AUDIUS_APP_NAME}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data: AudiusSearchResponse = await response.json();
    return (data.data || []).map(mapAudiusTrack);
  } catch (error) {
    console.error('Audius trending failed:', error);
    return [];
  }
}

// ---- Combined Open Source Search ----

export async function searchOpenMusic(query: string, limit: number = 20): Promise<SearchResult> {
  const tracks: Track[] = [];
  const seenIds = new Set<string>();

  // Search both Jamendo and Audius in parallel
  const [jamendoTracks, audiusTracks] = await Promise.allSettled([
    searchJamendo(query, limit),
    searchAudius(query, limit),
  ]);

  // Combine results - Jamendo first, then Audius
  if (jamendoTracks.status === 'fulfilled') {
    for (const track of jamendoTracks.value) {
      if (!seenIds.has(track.videoId)) {
        seenIds.add(track.videoId);
        tracks.push(track);
      }
    }
  }

  if (audiusTracks.status === 'fulfilled') {
    for (const track of audiusTracks.value) {
      if (!seenIds.has(track.videoId)) {
        seenIds.add(track.videoId);
        tracks.push(track);
      }
    }
  }

  // Extract unique artists from tracks
  const artistMap = new Map<string, Artist>();
  for (const track of tracks) {
    const key = track.artist.toLowerCase();
    if (!artistMap.has(key)) {
      artistMap.set(key, {
        id: `open-artist-${key.replace(/\s+/g, '-')}`,
        channelId: key.replace(/\s+/g, '-'),
        name: track.artist,
        thumbnail: track.thumbnail,
      });
    }
  }

  return {
    tracks: tracks.slice(0, limit),
    artists: Array.from(artistMap.values()).slice(0, 10),
    albums: [],
    playlists: [],
  };
}

// ---- Get Open Music Trending ----

export async function getOpenMusicTrending(limit: number = 20): Promise<Track[]> {
  const tracks: Track[] = [];
  const seenIds = new Set<string>();

  const [jamendoTracks, audiusTracks] = await Promise.allSettled([
    getJamendoPopular(limit),
    getAudiusTrending(limit),
  ]);

  if (jamendoTracks.status === 'fulfilled') {
    for (const track of jamendoTracks.value) {
      if (!seenIds.has(track.videoId)) {
        seenIds.add(track.videoId);
        tracks.push(track);
      }
    }
  }

  if (audiusTracks.status === 'fulfilled') {
    for (const track of audiusTracks.value) {
      if (!seenIds.has(track.videoId)) {
        seenIds.add(track.videoId);
        tracks.push(track);
      }
    }
  }

  return tracks.slice(0, limit);
}

// ---- Health Check ----

export async function isOpenMusicAvailable(): Promise<boolean> {
  try {
    const response = await fetch(
      `${JAMENDO_API}/tracks?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    return response.ok;
  } catch {
    return false;
  }
}
