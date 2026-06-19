// ============================================================
// SAAVNIFY V4 - InnerTube API Integration
// Ported from AirBeats' innertube/ module (Kotlin → TypeScript)
//
// Uses YouTube's private InnerTube API via the ANDROID_VR client
// which does NOT require auth, signature cipher, or poToken —
// returns direct audio stream URLs that work in HTML5 Audio.
//
// IMPORTANT: This module requires a CORS proxy because browsers
// cannot POST to music.youtube.com directly. Configure the proxy
// URL via `setInnertubeProxyUrl()` — typically a Cloudflare Worker.
// ============================================================

import type { Track, Artist, Album, SearchResult, SourceType } from '@/types';

const SOURCE: SourceType = 'youtube';

// ---- Proxy Configuration ----
// Default: same Cloudflare Worker that AirBeats uses for Listen Together.
// Override at runtime via setInnertubeProxyUrl() if you deploy your own.
let PROXY_BASE = 'https://saavnify-v5.aadarshkumar-co.workers.dev';

export function setInnertubeProxyUrl(url: string): void {
  PROXY_BASE = url.replace(/\/$/, '');
}

export function getInnertubeProxyUrl(): string {
  return PROXY_BASE;
}

// ---- YouTube Client Definitions ----
// Ported from AirBeats' YouTubeClient.kt

interface YouTubeClient {
  clientName: string;
  clientVersion: string;
  clientId: string;
  userAgent: string;
  osVersion?: string;
  loginSupported: boolean;
  useSignatureTimestamp: boolean;
  isEmbedded: boolean;
}

const ANDROID_VR: YouTubeClient = {
  clientName: 'ANDROID_VR',
  clientVersion: '1.61.48',
  clientId: '28',
  userAgent:
    'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Oculus Quest 3; Build/SQ3A.220605.009.A1; Cronet/132.0.6808.3)',
  loginSupported: false,
  useSignatureTimestamp: false,
  isEmbedded: false,
};

const WEB_REMIX: YouTubeClient = {
  clientName: 'WEB_REMIX',
  clientVersion: '1.20250310.01.00',
  clientId: '67',
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  loginSupported: true,
  useSignatureTimestamp: true,
  isEmbedded: false,
};

// ---- Context Builder ----
// Ported from YouTubeClient.toContext()

interface YtContext {
  client: {
    clientName: string;
    clientVersion: string;
    osVersion?: string;
    gl: string;
    hl: string;
    visitorData?: string;
  };
  user: {
    lockedSafetyMode: boolean;
    onBehalfOfUser?: string;
  };
}

function buildContext(client: YouTubeClient, locale: { gl: string; hl: string }): YtContext {
  return {
    client: {
      clientName: client.clientName,
      clientVersion: client.clientVersion,
      osVersion: client.osVersion,
      gl: locale.gl,
      hl: locale.hl,
    },
    user: {
      lockedSafetyMode: false,
      // onBehalfOfUser only set when logged in — we use ANDROID_VR (no login)
    },
  };
}

// ---- HTTP Layer ----
// All requests go through our CORS proxy, which forwards to
// https://music.youtube.com/youtubei/v1/<endpoint>

async function innertubePost<T>(
  endpoint: string,
  body: Record<string, unknown>,
  client: YouTubeClient = ANDROID_VR,
  locale: { gl: string; hl: string } = { gl: 'IN', hl: 'en' }
): Promise<T> {
  const url = `${PROXY_BASE}/${endpoint}`;

  const payload = {
    ...body,
    context: buildContext(client, locale),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Format-Version': '1',
      'X-YouTube-Client-Name': client.clientId,
      'X-YouTube-Client-Version': client.clientVersion,
      'User-Agent': client.userAgent,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `InnerTube ${endpoint} failed: ${response.status} ${response.statusText} — ${text.slice(0, 200)}`
    );
  }

  return response.json() as Promise<T>;
}

// ---- Response Types (simplified, ignoreUnknownKeys-style) ----
// We only parse the fields we actually use.

interface PlayerResponse {
  playabilityStatus?: { status: string; reason?: string };
  streamingData?: {
    expiresInSeconds?: number;
    adaptiveFormats?: Array<{
      itag: number;
      url?: string;
      mimeType: string;
      bitrate: number;
      contentLength?: string;
      audioQuality?: string;
      approxDurationMs?: string;
      audioSampleRate?: string;
    }>;
    formats?: Array<{
      itag: number;
      url?: string;
      mimeType: string;
      bitrate: number;
    }>;
  };
  videoDetails?: {
    videoId: string;
    title: string;
    author: string;
    channelId: string;
    lengthSeconds: string;
    thumbnail: { thumbnails: Array<{ url: string; width: number; height: number }> };
  };
}

interface SearchResponse {
  contents?: {
    tabbedSearchResultsRenderer?: {
      tabs?: Array<{
        tabRenderer?: {
          content?: {
            sectionListRenderer?: {
              contents?: Array<{
                musicShelfRenderer?: {
                  title?: { runs?: Array<{ text: string }> };
                  contents?: Array<{
                    musicResponsiveListItemRenderer?: MusicResponsiveListItemRenderer;
                  }>;
                  continuations?: Array<{ nextContinuationData?: { continuation: string } }>;
                };
                musicCardShelfRenderer?: {
                  header?: { musicCardShelfHeaderBasicRenderer?: { title?: { runs?: Array<{ text: string }> } } };
                  contents?: Array<{ musicResponsiveListItemRenderer?: MusicResponsiveListItemRenderer }>;
                };
              }>;
            };
          };
        };
      }>;
    };
  };
}

interface MusicResponsiveListItemRenderer {
  playlistItemData?: { videoId?: string };
  navigationEndpoint?: {
    watchEndpoint?: { videoId?: string };
    browseEndpoint?: { browseId?: string };
  };
  flexColumns?: Array<{
    musicResponsiveListItemFlexColumnRenderer?: {
      text?: { runs?: Array<{ text: string; navigationEndpoint?: any }> };
    };
  }>;
  thumbnail?: {
    musicThumbnailRenderer?: {
      thumbnail?: { thumbnails?: Array<{ url: string }> };
    };
  };
  badges?: Array<{
    musicInlineBadgeRenderer?: { icon?: { iconType?: string } };
  }>;
}

// ---- Helpers ----

function parseTimeToSeconds(text: string): number {
  if (!text) return 0;
  const parts = text.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function splitBySeparator(
  runs: Array<{ text: string }> | undefined
): Array<Array<{ text: string; navigationEndpoint?: any }>> {
  if (!runs) return [];
  const groups: Array<Array<{ text: string; navigationEndpoint?: any }>> = [];
  let current: Array<{ text: string; navigationEndpoint?: any }> = [];
  for (const run of runs) {
    if (run.text === ' • ' || run.text === ' •') {
      groups.push(current);
      current = [];
    } else {
      current.push(run);
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function oddElements<T>(arr: T[]): T[] {
  return arr.filter((_, i) => i % 2 === 0);
}

function getBestThumbnail(thumbnails: Array<{ url: string; width?: number }> = []): string {
  if (thumbnails.length === 0) return '';
  // Prefer highest resolution
  return [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))[0].url;
}

// ---- Convert renderer → Track ----

function rendererToTrack(renderer: MusicResponsiveListItemRenderer): Track | null {
  const videoId =
    renderer.playlistItemData?.videoId ||
    renderer.navigationEndpoint?.watchEndpoint?.videoId;
  if (!videoId) return null;

  const flexColumns = renderer.flexColumns || [];
  const title =
    flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ||
    'Unknown Title';

  const secondaryRuns =
    flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
  const secondaryLine = splitBySeparator(secondaryRuns);
  const artistText =
    secondaryLine[0]?.length
      ? oddElements(secondaryLine[0])
          .map((r) => r.text)
          .join(' ')
      : 'Unknown Artist';

  const durationText = secondaryLine[secondaryLine.length - 1]?.[0]?.text || '';
  const duration = parseTimeToSeconds(durationText);

  const thumbnail =
    renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url || '';

  const explicit =
    renderer.badges?.some(
      (b) => b.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
    ) ?? false;

  return {
    id: `yt-${videoId}`,
    videoId,
    title,
    artist: artistText,
    thumbnail,
    duration,
    channelTitle: artistText,
    addedAt: Date.now(),
    source: SOURCE,
    // streamUrl will be resolved lazily via getInnertubeStreamUrl()
  };
}

// ============================================================
// PUBLIC API — Search
// ============================================================

export async function searchInnertube(
  query: string,
  maxResults: number = 20
): Promise<SearchResult> {
  try {
    const data = await innertubePost<SearchResponse>('search', {
      query,
      params: 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D', // music_songs filter (base64)
    });

    const shelfContents =
      data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents || [];

    const tracks: Track[] = [];
    const artists: Artist[] = [];
    const albums: Album[] = [];

    for (const section of shelfContents) {
      const shelf = section.musicShelfRenderer;
      if (!shelf?.contents) continue;

      for (const item of shelf.contents) {
        const renderer = item.musicResponsiveListItemRenderer;
        if (!renderer) continue;
        const track = rendererToTrack(renderer);
        if (track && tracks.length < maxResults) {
          tracks.push(track);
        }
      }
    }

    return { tracks, artists, albums, playlists: [] };
  } catch (error) {
    console.error('InnerTube search failed:', error);
    return { tracks: [], artists: [], albums: [], playlists: [] };
  }
}

// ============================================================
// PUBLIC API — Stream URL Resolution
// This is the KEY function — returns a direct audio URL
// that works with HTML5 Audio (no IFrame needed).
// ============================================================

export async function getInnertubeStreamUrl(
  videoId: string
): Promise<string | null> {
  try {
    const data = await innertubePost<PlayerResponse>('player', {
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          // signatureTimestamp=0 works for ANDROID_VR since useSignatureTimestamp=false
          signatureTimestamp: 0,
        },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    });

    if (data.playabilityStatus?.status !== 'OK') {
      console.warn(
        `InnerTube playability error for ${videoId}:`,
        data.playabilityStatus?.reason
      );
      return null;
    }

    const adaptive = data.streamingData?.adaptiveFormats || [];
    const progressive = data.streamingData?.formats || [];

    // Filter audio-only streams (mimeType starts with audio/)
    const audioStreams = [...adaptive, ...progressive].filter(
      (f) => f.url && f.mimeType?.startsWith('audio/')
    );

    if (audioStreams.length === 0) return null;

    // Prefer highest-bitrate audio/mp4 (most compatible with HTML5 Audio)
    // Fall back to opus/webm if mp4 not available
    const sorted = [...audioStreams].sort((a, b) => {
      const aIsMp4 = a.mimeType.includes('audio/mp4') || a.mimeType.includes('mp4a');
      const bIsMp4 = b.mimeType.includes('audio/mp4') || b.mimeType.includes('mp4a');
      if (aIsMp4 && !bIsMp4) return -1;
      if (!aIsMp4 && bIsMp4) return 1;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

    return sorted[0].url || null;
  } catch (error) {
    console.error('InnerTube stream resolution failed:', error);
    return null;
  }
}

// ============================================================
// PUBLIC API — Video Details (replaces YouTube Data API)
// ============================================================

export async function getInnertubeVideoDetails(
  videoId: string
): Promise<Track | null> {
  try {
    const data = await innertubePost<PlayerResponse>('player', {
      videoId,
      playbackContext: {
        contentPlaybackContext: { signatureTimestamp: 0 },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    });

    const details = data.videoDetails;
    if (!details) return null;

    return {
      id: `yt-${details.videoId}`,
      videoId: details.videoId,
      title: details.title,
      artist: details.author,
      thumbnail: getBestThumbnail(details.thumbnail?.thumbnails || []),
      duration: parseInt(details.lengthSeconds, 10) || 0,
      channelTitle: details.author,
      addedAt: Date.now(),
      source: SOURCE,
    };
  } catch (error) {
    console.error('InnerTube video details failed:', error);
    return null;
  }
}

// ============================================================
// PUBLIC API — Trending / Browse (Home feed)
// Uses the "FEmusic_trending" browse ID for India.
// ============================================================

export async function getInnertubeTrending(
  limit: number = 20
): Promise<Track[]> {
  try {
    const data = await innertubePost<SearchResponse>('browse', {
      browseId: 'FEmusic_trending',
    });

    const contents =
      data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents || [];

    const tracks: Track[] = [];
    for (const section of contents) {
      const shelf = section.musicShelfRenderer;
      if (!shelf?.contents) continue;
      for (const item of shelf.contents) {
        const renderer = item.musicResponsiveListItemRenderer;
        if (!renderer) continue;
        const track = rendererToTrack(renderer);
        if (track && tracks.length < limit) tracks.push(track);
      }
    }

    return tracks;
  } catch (error) {
    console.error('InnerTube trending failed:', error);
    return [];
  }
}

// ============================================================
// PUBLIC API — Health Check
// ============================================================

export async function isInnertubeAvailable(): Promise<boolean> {
  try {
    // Cheap probe — search for a common query with maxResults=1
    const result = await searchInnertube('test', 1);
    // Available if we got ANY response (even empty results means the API responded)
    return Array.isArray(result.tracks);
  } catch {
    return false;
  }
}

// ============================================================
// PUBLIC API — Category Search (reuse search)
// ============================================================

export async function searchInnertubeByCategory(
  category: string,
  limit: number = 20
): Promise<Track[]> {
  // Reuse Piped's category→query map by importing it lazily
  // to avoid a circular dependency.
  const { INDIAN_CATEGORIES } = await import('@/lib/sources/piped-api');
  const cat = (INDIAN_CATEGORIES as Record<string, { query: string }>)[category];
  const query = cat?.query || `${category} music`;

  const result = await searchInnertube(query, limit);
  return result.tracks;
}
