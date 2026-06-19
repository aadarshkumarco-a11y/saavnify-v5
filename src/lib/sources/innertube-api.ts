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
    // Structure 1: WEB_REMIX client wraps in tabs
    tabbedSearchResultsRenderer?: {
      tabs?: Array<{
        tabRenderer?: {
          content?: {
            sectionListRenderer?: {
              contents?: Array<SearchSection>;
            };
          };
        };
      }>;
    };
    // Structure 2: ANDROID_VR client returns sectionListRenderer directly
    sectionListRenderer?: {
      contents?: Array<SearchSection>;
    };
    // Structure 3: browse endpoint may use singleColumnBrowseResultsRenderer
    singleColumnBrowseResultsRenderer?: {
      tabs?: Array<{
        tabRenderer?: {
          content?: {
            sectionListRenderer?: {
              contents?: Array<SearchSection>;
            };
          };
        };
      }>;
    };
  };
}

interface SearchSection {
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
  // ANDROID_VR client returns items inside itemSectionRenderer as compactVideoRenderer
  itemSectionRenderer?: {
    contents?: Array<{
      compactVideoRenderer?: CompactVideoRenderer;
    }>;
    continuations?: Array<{ nextContinuationData?: { continuation: string } }>;
  };
}

interface CompactVideoRenderer {
  videoId: string;
  title?: { runs?: Array<{ text: string }> };
  longBylineText?: { runs?: Array<{ text: string }> };
  shortBylineText?: { runs?: Array<{ text: string }> };
  lengthText?: { runs?: Array<{ text: string }>; simpleText?: string };
  thumbnail?: { thumbnails?: Array<{ url: string; width?: number; height?: number }> };
  viewCountText?: { runs?: Array<{ text: string }>; simpleText?: string };
  shortViewCountText?: { runs?: Array<{ text: string }>; simpleText?: string };
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

/**
 * Extract shelf sections from a YouTube InnerTube response.
 * Handles THREE different response shapes:
 *   1. contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer
 *      (WEB_REMIX / search)
 *   2. contents.sectionListRenderer  (ANDROID_VR / search — flat, no tabs)
 *   3. contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer
 *      (browse endpoint)
 */
function extractShelfSections(data: SearchResponse): SearchSection[] {
  const c = data.contents;
  if (!c) return [];

  // Shape 2: flat sectionListRenderer (ANDROID_VR search)
  if (c.sectionListRenderer?.contents) {
    return c.sectionListRenderer.contents;
  }

  // Shape 1: tabbed search results (WEB_REMIX)
  const tabbed = c.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
    ?.sectionListRenderer?.contents;
  if (tabbed) return tabbed;

  // Shape 3: browse results
  const browsed = c.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
    ?.sectionListRenderer?.contents;
  if (browsed) return browsed;

  return [];
}

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

// ---- Convert compactVideoRenderer → Track ----
// Used when ANDROID_VR client is the source.
function compactVideoToTrack(cvr: CompactVideoRenderer): Track | null {
  if (!cvr.videoId) return null;

  const title = cvr.title?.runs?.map((r) => r.text).join('').trim() || 'Unknown Title';

  // Artist: prefer longBylineText, fall back to shortBylineText
  const artistText =
    cvr.longBylineText?.runs?.map((r) => r.text).join('').trim() ||
    cvr.shortBylineText?.runs?.map((r) => r.text).join('').trim() ||
    'Unknown Artist';

  // Duration: lengthText can be { runs: [{ text: "4:24" }] } or { simpleText: "4:24" }
  const durationText = cvr.lengthText?.simpleText || cvr.lengthText?.runs?.[0]?.text || '';
  const duration = parseTimeToSeconds(durationText);

  // Thumbnail: pick highest-resolution
  const thumbnails = cvr.thumbnail?.thumbnails || [];
  const thumbnail = thumbnails.length
    ? [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))[0].url
    : '';

  // View count: prefer shortViewCountText.simpleText (e.g. "5B views")
  const viewCount = cvr.shortViewCountText?.simpleText ||
    cvr.viewCountText?.simpleText ||
    cvr.viewCountText?.runs?.map((r) => r.text).join('') ||
    undefined;

  return {
    id: `yt-${cvr.videoId}`,
    videoId: cvr.videoId,
    title,
    artist: artistText,
    thumbnail,
    duration,
    channelTitle: artistText,
    viewCount,
    addedAt: Date.now(),
    source: SOURCE,
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

    const shelfContents = extractShelfSections(data);

    const tracks: Track[] = [];
    const artists: Artist[] = [];
    const albums: Album[] = [];

    for (const section of shelfContents) {
      // Case A: WEB_REMIX-style musicShelfRenderer with musicResponsiveListItemRenderer
      const shelf = section.musicShelfRenderer;
      if (shelf?.contents) {
        for (const item of shelf.contents) {
          const renderer = item.musicResponsiveListItemRenderer;
          if (!renderer) continue;
          const track = rendererToTrack(renderer);
          if (track && tracks.length < maxResults) tracks.push(track);
        }
      }

      // Case B: ANDROID_VR-style itemSectionRenderer with compactVideoRenderer
      const itemSection = section.itemSectionRenderer;
      if (itemSection?.contents) {
        for (const item of itemSection.contents) {
          const cvr = item.compactVideoRenderer;
          if (!cvr) continue;
          const track = compactVideoToTrack(cvr);
          if (track && tracks.length < maxResults) tracks.push(track);
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

    const contents = extractShelfSections(data);

    const tracks: Track[] = [];
    for (const section of contents) {
      // Case A: WEB_REMIX-style
      const shelf = section.musicShelfRenderer;
      if (shelf?.contents) {
        for (const item of shelf.contents) {
          const renderer = item.musicResponsiveListItemRenderer;
          if (!renderer) continue;
          const track = rendererToTrack(renderer);
          if (track && tracks.length < limit) tracks.push(track);
        }
      }

      // Case B: ANDROID_VR-style
      const itemSection = section.itemSectionRenderer;
      if (itemSection?.contents) {
        for (const item of itemSection.contents) {
          const cvr = item.compactVideoRenderer;
          if (!cvr) continue;
          const track = compactVideoToTrack(cvr);
          if (track && tracks.length < limit) tracks.push(track);
        }
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

// ============================================================
// PUBLIC API — Explore / New Releases / Related / Next (Radio)
// Ported from AirBeats innertube/pages/* modules.
// All use the ANDROID_VR client via the configured proxy.
// ============================================================

interface InnertubeResponse {
  contents?: any;
  continuationContents?: any;
  [k: string]: any;
}

// Safe wrapper around the existing typed innertubePost<T> — returns null on
// any error instead of throwing, so the new explore/related/artist/album
// helpers degrade gracefully.
async function safeInnertubePost(endpoint: string, body: Record<string, any>): Promise<InnertubeResponse | null> {
  try {
    return await innertubePost<InnertubeResponse>(endpoint, body);
  } catch {
    return null;
  }
}

// Extract tracks from a list of "musicResponsiveListItemRenderer" nodes
function extractTracksFromItems(items: any[]): Track[] {
  const tracks: Track[] = [];
  for (const item of items) {
    try {
      const r = item.musicResponsiveListItemRenderer || item;
      const videoId =
        r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
        r.playlistItemData?.videoId ||
        r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.find((x: any) => x.navigationEndpoint?.watchEndpoint?.videoId)?.navigationEndpoint?.watchEndpoint?.videoId;
      if (!videoId) continue;
      const titleRuns = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const subtitleRuns = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const title = titleRuns.map((x: any) => x.text).join('') || 'Unknown';
      const artist = subtitleRuns.map((x: any) => x.text).join(' ').trim() || 'Unknown artist';
      const thumb = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url || '';
      tracks.push({
        id: `yt-${videoId}`,
        videoId,
        title,
        artist,
        thumbnail: thumb,
        duration: 0,
        channelTitle: artist,
        addedAt: Date.now(),
        source: 'youtube',
      });
    } catch {}
  }
  return tracks;
}

function extractAlbumsFromItems(items: any[]): Album[] {
  const albums: Album[] = [];
  for (const item of items) {
    try {
      const r = item.musicTwoRowItemRenderer || item.musicResponsiveListItemRenderer || item;
      const title = r.title?.runs?.[0]?.text || r.subtitle?.runs?.[0]?.text || 'Unknown album';
      const playlistId =
        r.navigationEndpoint?.browseEndpoint?.browseId ||
        r.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
      const thumb = r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url || '';
      const artist = r.subtitle?.runs?.map((x: any) => x.text).join(' ').trim() || '';
      albums.push({
        id: playlistId || `al-${albums.length}`,
        playlistId,
        title,
        artist,
        thumbnail: thumb,
      });
    } catch {}
  }
  return albums;
}

/** Explore — YouTube Music "explore" tab (charts, moods, new releases) */
export async function getInnertubeExplore(): Promise<{
  newReleases: Album[];
  topTracks: Track[];
}> {
  const data = await safeInnertubePost('explore', {});
  const tabs = data?.contents?.tabbedSearchResultsRenderer?.tabs || [];
  const newReleases: Album[] = [];
  const topTracks: Track[] = [];
  for (const tab of tabs) {
    const sections = tab.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const s of sections) {
      const car = s.musicCarouselShelfRenderer;
      if (!car) continue;
      const items = car.contents || [];
      if (car.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text?.toLowerCase().includes('new')) {
        newReleases.push(...extractAlbumsFromItems(items));
      } else {
        topTracks.push(...extractTracksFromItems(items.map((i: any) => i.musicResponsiveListItemRenderer || {}).filter(Boolean)));
      }
    }
  }
  return { newReleases, topTracks };
}

/** New Releases — albums newly released on YouTube Music */
export async function getInnertubeNewReleases(limit = 20): Promise<Album[]> {
  const data = await safeInnertubePost('new_releases', { limit });
  const items = data?.contents?.sectionListRenderer?.contents?.[0]?.gridRenderer?.items || [];
  return extractAlbumsFromItems(items).slice(0, limit);
}

/** Related — "related" artists/tracks for a given video */
export async function getInnertubeRelated(videoId: string): Promise<Track[]> {
  const data = await safeInnertubePost('next', { videoId, watchEndpoint: { videoId } });
  const items =
    data?.contents?.singleColumnMusicWatchResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || [];
  return extractTracksFromItems(
    items
      .map((i: any) => i.playlistPanelVideoRenderer || i.musicResponsiveListItemRenderer || {})
      .filter((x: any) => Object.keys(x).length > 0)
  );
}

/** Next — "radio" mode: get a continuous playlist based on a seed video */
export async function getInnertubeRadio(videoId: string, limit = 25): Promise<Track[]> {
  const data = await safeInnertubePost('radio', { videoId, limit });
  const items = data?.contents?.playlistPanelRenderer?.contents || [];
  return extractTracksFromItems(
    items.map((i: any) => i.playlistPanelVideoRenderer || {}).filter((x: any) => Object.keys(x).length > 0)
  ).slice(0, limit);
}

/** Artist page — top songs + albums for a channel */
export async function getInnertubeArtist(channelId: string): Promise<{
  artist: Artist;
  topTracks: Track[];
  albums: Album[];
}> {
  const data = await safeInnertubePost('artist', { channelId });
  const sections = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  let topTracks: Track[] = [];
  let albums: Album[] = [];
  let name = 'Unknown artist';
  let thumb = '';
  let subs = '';
  const header = data?.header?.musicImmersiveHeaderRenderer;
  if (header) {
    name = header.title?.runs?.[0]?.text || name;
    thumb = header.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url || '';
    subs = header.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text || '';
  }
  for (const s of sections) {
    const car = s.musicCarouselShelfRenderer;
    if (!car) continue;
    const items = car.contents || [];
    if (car.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text?.toLowerCase().includes('song')) {
      topTracks = extractTracksFromItems(items.map((i: any) => i.musicResponsiveListItemRenderer || {}).filter((x: any) => Object.keys(x).length > 0));
    } else {
      albums = extractAlbumsFromItems(items);
    }
  }
  return {
    artist: { id: channelId, channelId, name, thumbnail: thumb, subscriberCount: subs, description: '' },
    topTracks,
    albums,
  };
}

/** Album page — tracks in an album (playlistId = OLAK5uy_... or browseId) */
export async function getInnertubeAlbum(browseId: string): Promise<{ album: Album; tracks: Track[] }> {
  const data = await safeInnertubePost('album', { browseId });
  const items =
    data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
      ?.musicShelfRenderer?.contents || [];
  const tracks = extractTracksFromItems(items.map((i: any) => i.musicResponsiveListItemRenderer || {}).filter((x: any) => Object.keys(x).length > 0));
  const header = data?.header?.musicDetailHeaderRenderer || data?.header?.musicEditablePlaylistDetailHeaderRenderer;
  const album: Album = {
    id: browseId,
    playlistId: browseId,
    title: header?.title?.runs?.[0]?.text || 'Unknown album',
    artist: header?.subtitle?.runs?.map((x: any) => x.text).join(' ').trim() || '',
    thumbnail: header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url || '',
  };
  return { album, tracks };
}
