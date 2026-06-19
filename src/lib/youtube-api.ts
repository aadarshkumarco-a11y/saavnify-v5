import type {
  Track,
  Artist,
  Album,
  SearchResult,
  VideoDetail,
  ChannelDetail,
  PlaylistDetail,
  YouTubeSearchResult,
  YouTubeSearchItem,
  YouTubeVideoDetail,
  YouTubeVideoItem,
  YouTubeChannelDetail,
  YouTubeChannelItem,
  YouTubeThumbnails,
  YouTubePlaylistDetail,
  YouTubePlaylistItem,
} from '@/types';
import { getApiKey } from '@/lib/api-key-manager';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Get API key from user-provided storage (no hardcoded keys)
function getActiveApiKey(): string {
  const key = getApiKey();
  if (!key) {
    throw new YouTubeAPIError('YouTube API key not configured. Please add your API key in Settings.');
  }
  return key;
}

// ---- Helper: Parse ISO 8601 Duration to Seconds ----

export function parseDuration(iso: string): number {
  if (!iso) return 0;

  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// ---- Helper: Get Best Thumbnail ----

function getBestThumbnail(thumbnails: YouTubeThumbnails): string {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ''
  );
}

// ---- Helper: Generate Track ID ----

function generateId(videoId: string): string {
  return `yt-${videoId}`;
}

// ---- Error Handling ----

class YouTubeAPIError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'YouTubeAPIError';
    this.status = status;
  }
}

async function fetchAPI<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('key', getActiveApiKey());
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new YouTubeAPIError(
        (errorData as { error?: { message?: string } })?.error?.message || `API error: ${response.status}`,
        response.status
      );
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof YouTubeAPIError) throw error;
    throw new YouTubeAPIError(`Network error: ${(error as Error).message}`);
  }
}

// ---- Search Videos ----

export async function searchVideos(
  query: string,
  maxResults: number = 20
): Promise<SearchResult> {
  const data = await fetchAPI<YouTubeSearchResult>('search', {
    part: 'snippet',
    q: `${query} music`,
    type: 'video,channel,playlist',
    maxResults: String(maxResults),
    videoCategoryId: '10',
    safeSearch: 'moderate',
  });

  const tracks: Track[] = [];
  const artists: Artist[] = [];
  const albums: Album[] = [];

  for (const item of data.items) {
    if (item.id.videoId) {
      tracks.push({
        id: generateId(item.id.videoId),
        videoId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: getBestThumbnail(item.snippet.thumbnails),
        duration: 0,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        addedAt: Date.now(),
      });
    } else if (item.id.channelId) {
      artists.push({
        id: `ch-${item.id.channelId}`,
        channelId: item.id.channelId,
        name: item.snippet.title,
        thumbnail: getBestThumbnail(item.snippet.thumbnails),
      });
    } else if (item.id.playlistId) {
      albums.push({
        id: `pl-${item.id.playlistId}`,
        playlistId: item.id.playlistId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: getBestThumbnail(item.snippet.thumbnails),
      });
    }
  }

  return { tracks, artists, albums, playlists: [] };
}

// ---- Get Video Details ----

export async function getVideoDetails(videoId: string): Promise<VideoDetail | null> {
  const data = await fetchAPI<YouTubeVideoDetail>('videos', {
    part: 'snippet,contentDetails,statistics',
    id: videoId,
  });

  if (!data.items || data.items.length === 0) return null;

  const video = data.items[0];
  return mapVideoItemToDetail(video);
}

// ---- Get Multiple Video Details ----

export async function getMultipleVideoDetails(
  videoIds: string[]
): Promise<VideoDetail[]> {
  if (videoIds.length === 0) return [];

  const data = await fetchAPI<YouTubeVideoDetail>('videos', {
    part: 'snippet,contentDetails,statistics',
    id: videoIds.join(','),
  });

  return (data.items || []).map(mapVideoItemToDetail);
}

// ---- Map YouTube Video Item to VideoDetail ----

function mapVideoItemToDetail(video: YouTubeVideoItem): VideoDetail {
  return {
    videoId: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    channelTitle: video.snippet.channelTitle,
    channelId: video.snippet.channelId,
    publishedAt: video.snippet.publishedAt,
    duration: parseDuration(video.contentDetails.duration),
    viewCount: video.statistics.viewCount,
    likeCount: video.statistics.likeCount,
    thumbnail: getBestThumbnail(video.snippet.thumbnails),
    tags: video.snippet.tags,
  };
}

// ---- Get Channel Details ----

export async function getChannelDetails(
  channelId: string
): Promise<ChannelDetail | null> {
  const data = await fetchAPI<YouTubeChannelDetail>('channels', {
    part: 'snippet,statistics',
    id: channelId,
  });

  if (!data.items || data.items.length === 0) return null;

  const channel = data.items[0];
  return {
    channelId: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    thumbnail: getBestThumbnail(channel.snippet.thumbnails),
    subscriberCount: channel.statistics.subscriberCount,
    videoCount: channel.statistics.videoCount,
    viewCount: channel.statistics.viewCount,
    customUrl: channel.snippet.customUrl,
  };
}

// ---- Get Playlist Details ----

export async function getPlaylistDetails(
  playlistId: string
): Promise<PlaylistDetail | null> {
  const data = await fetchAPI<YouTubePlaylistDetail>('playlists', {
    part: 'snippet,contentDetails',
    id: playlistId,
  });

  if (!data.items || data.items.length === 0) return null;

  const playlist = data.items[0];
  return {
    playlistId: playlist.id,
    title: playlist.snippet.title,
    description: playlist.snippet.description,
    channelTitle: playlist.snippet.channelTitle,
    thumbnail: getBestThumbnail(playlist.snippet.thumbnails),
    itemCount: (playlist as { contentDetails?: { itemCount?: number } }).contentDetails?.itemCount || 0,
    publishedAt: playlist.snippet.publishedAt,
  };
}

// ---- Get Playlist Items ----

export async function getPlaylistItems(
  playlistId: string,
  maxResults: number = 50
): Promise<Track[]> {
  const data = await fetchAPI<YouTubePlaylistDetail>('playlistItems', {
    part: 'snippet,contentDetails',
    playlistId,
    maxResults: String(Math.min(maxResults, 50)),
  });

  const tracks: Track[] = [];

  for (const item of data.items || []) {
    const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
    if (videoId) {
      tracks.push({
        id: generateId(videoId),
        videoId,
        title: item.snippet.title || 'Unknown Track',
        artist: item.snippet.channelTitle || 'Unknown Artist',
        thumbnail: getBestThumbnail(item.snippet.thumbnails),
        duration: 0,
        channelTitle: item.snippet.channelTitle || 'Unknown Artist',
        publishedAt: item.snippet.publishedAt,
        addedAt: Date.now(),
      });
    }
  }

  return tracks;
}

// ---- Get Trending Music ----

export async function getTrendingMusic(
  maxResults: number = 20
): Promise<Track[]> {
  const data = await fetchAPI<YouTubeVideoDetail>('videos', {
    part: 'snippet,contentDetails,statistics',
    chart: 'mostPopular',
    videoCategoryId: '10',
    maxResults: String(maxResults),
    regionCode: 'US',
  });

  return (data.items || []).map((video) => ({
    id: generateId(video.id),
    videoId: video.id,
    title: video.snippet.title,
    artist: video.snippet.channelTitle,
    thumbnail: getBestThumbnail(video.snippet.thumbnails),
    duration: parseDuration(video.contentDetails.duration),
    channelTitle: video.snippet.channelTitle,
    publishedAt: video.snippet.publishedAt,
    viewCount: video.statistics.viewCount,
    likeCount: video.statistics.likeCount,
    addedAt: Date.now(),
  }));
}

// ---- Search by Category ----

export async function searchByCategory(
  query: string,
  category?: string
): Promise<Track[]> {
  const searchQuery = category ? `${category} ${query} music` : `${query} music`;

  const data = await fetchAPI<YouTubeSearchResult>('search', {
    part: 'snippet',
    q: searchQuery,
    type: 'video',
    maxResults: '20',
    videoCategoryId: '10',
    safeSearch: 'moderate',
  });

  return (data.items || [])
    .filter((item): item is YouTubeSearchItem & { id: { videoId: string } } => !!item.id.videoId)
    .map((item) => ({
      id: generateId(item.id.videoId),
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: getBestThumbnail(item.snippet.thumbnails),
      duration: 0,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      addedAt: Date.now(),
    }));
}

// ---- Get Related Videos ----

export async function getRelatedVideos(
  videoId: string,
  maxResults: number = 10
): Promise<Track[]> {
  const data = await fetchAPI<YouTubeSearchResult>('search', {
    part: 'snippet',
    relatedToVideoId: videoId,
    type: 'video',
    maxResults: String(maxResults),
    videoCategoryId: '10',
  });

  return (data.items || [])
    .filter((item): item is YouTubeSearchItem & { id: { videoId: string } } => !!item.id.videoId)
    .map((item) => ({
      id: generateId(item.id.videoId),
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: getBestThumbnail(item.snippet.thumbnails),
      duration: 0,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      addedAt: Date.now(),
    }));
}

// ---- Format Helpers ----

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatViewCount(count: string): string {
  const num = parseInt(count, 10);
  if (isNaN(num)) return '0';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}
