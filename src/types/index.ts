// ============================================================
// SAAVNIFY V4 - Type Definitions
// ============================================================

// ---- Core Music Types ----

/** Music source type - identifies which provider a track comes from */
export type SourceType = 'piped' | 'jiosaavn' | 'jamendo' | 'audius' | 'archive' | 'youtube' | 'cache';

export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number; // seconds
  channelTitle: string;
  publishedAt?: string;
  viewCount?: string;
  likeCount?: string;
  addedAt: number;
  /** Which music source this track came from */
  source?: SourceType;
  /** Direct audio stream URL (for non-YouTube sources) */
  streamUrl?: string;
  /** Album name if available */
  album?: string;
  /** Language of the track */
  language?: string;
  /** Release year */
  year?: string;
  /** Permalink for sharing */
  permalink?: string;
}

export interface Artist {
  id: string;
  channelId: string;
  name: string;
  thumbnail: string;
  subscriberCount?: string;
  description?: string;
  isFavorite?: boolean;
}

export interface Album {
  id: string;
  playlistId: string;
  title: string;
  artist: string;
  thumbnail: string;
  trackCount?: number;
  description?: string;
  publishedAt?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  trackCount: number;
  isSmart?: boolean;
  smartRules?: SmartPlaylistRules;
}

export interface PlaylistSong {
  id?: number;
  playlistId: string;
  songId: string;
  position: number;
  addedAt: number;
}

// ---- Search Types ----

export interface SearchResult {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}

export interface VideoDetail {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: number;
  viewCount: string;
  likeCount: string;
  thumbnail: string;
  tags?: string[];
}

export interface ChannelDetail {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  customUrl?: string;
}

export interface PlaylistDetail {
  playlistId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnail: string;
  itemCount: number;
  publishedAt: string;
}

// ---- Player Types ----

export type RepeatMode = 'off' | 'all' | 'one';

export interface QueueItem {
  track: Track;
  addedAt: number;
  source?: string; // e.g. 'search', 'playlist:abc123'
}

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: QueueItem[];
  queueIndex: number;
  sleepTimer: number | null; // minutes remaining, null = off
  sleepTimerEnd: number | null; // timestamp when sleep timer ends
}

// ---- Theme Types ----

export type ThemeName = 'spotify-dark' | 'amoled-black' | 'youtube-music' | 'light' | 'material-you';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  background: string;
  secondaryBg: string;
  cardBg: string;
  elevatedSurface: string;
  accent: string;
  primaryText: string;
  secondaryText: string;
  border: string;
}

export interface ThemeState {
  selectedTheme: ThemeName;
  accentColor: string;
  amoledMode: boolean;
  dynamicColors: boolean;
}

// ---- AirBeats-style Style Enums (ported) ----

/** Full-screen player visual style (maps AirBeats PlayerScreenStyle) */
export type PlayerStyle =
  | 'classic'      // default existing
  | 'modern'       // sleek dark
  | 'spotify'      // spotify-inspired
  | 'liquid'       // fluid gradients
  | 'cloudglow'    // soft glowing cloud
  | 'frost'        // frosted glass
  | 'fold'         // folded card
  | 'groove'       // circular vinyl
  | 'popsy'        // colorful pop
  | 'minimal'      // ultra minimal
  | 'paper';       // paper-flat

/** Home screen layout style */
export type HomeStyle = 'classic' | 'playful' | 'neon' | 'spotify';

/** Library screen layout style */
export type LibraryStyle = 'classic' | 'playful' | 'neon';

/** Mini player style */
export type MiniPlayerStyle = 'classic' | 'neon';

/** Slider style */
export type SliderStyle = 'default' | 'squiggly';

/** Audio quality preference */
export type AudioQuality = 'auto' | 'high' | 'low';

/** Library view type */
export type LibraryViewType = 'list' | 'grid';

/** App settings (persisted) */
export interface AppSettings {
  playerStyle: PlayerStyle;
  homeStyle: HomeStyle;
  libraryStyle: LibraryStyle;
  miniPlayerStyle: MiniPlayerStyle;
  sliderStyle: SliderStyle;
  audioQuality: AudioQuality;
  libraryView: LibraryViewType;
  persistentQueue: boolean;
  skipSilence: boolean;
  audioNormalization: boolean;
  autoLoadMore: boolean;
  autoSkipOnError: boolean;
  stopMusicOnTaskClear: boolean;
  showLikeButton: boolean;
  showDownloadButton: boolean;
  lyricsProvider: 'lrclib' | 'kugou' | 'youtube' | 'auto';
  dynamicColors: boolean;
  language: string;
}

// ---- User Types ----

export interface UserProfile {
  name: string;
  avatar: string;
  bio: string;
  joinedAt: number;
}

export interface UserStats {
  totalListeningTime: number; // minutes
  totalTracksPlayed: number;
  topArtists: Artist[];
  topGenres: string[];
  weeklyListeningTime: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  progress: number; // 0-100
}

export interface UserProfileState {
  profile: UserProfile;
  favoriteArtists: Artist[];
  favoriteGenres: string[];
  achievements: Achievement[];
  stats: UserStats;
}

// ---- History Types ----

export interface HistoryEntry {
  id?: number;
  songId: string;
  track: Track;
  playedAt: number;
  playDuration: number; // how long the track was played (seconds)
}

export interface SearchHistoryEntry {
  id?: number;
  query: string;
  searchedAt: number;
}

// ---- Analytics Types ----

export interface AnalyticsData {
  dailyListening: Record<string, number>; // date -> minutes
  topTracks: Track[];
  topArtists: Artist[];
  listeningStreak: number;
  genreDistribution: Record<string, number>;
  averageSessionLength: number;
}

// ---- Smart Playlist Types ----

export interface SmartPlaylistRules {
  matchAll: boolean;
  conditions: SmartPlaylistCondition[];
}

export interface SmartPlaylistCondition {
  field: 'artist' | 'genre' | 'duration' | 'playCount' | 'addedDate' | 'rating';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | [number, number];
}

// ---- Recommendation Types ----

export interface Recommendation {
  id?: number;
  trackId: string;
  track: Track;
  reason: string;
  score: number;
  createdAt: number;
}

// ---- Settings Types ----

export interface AppSettings {
  audioQuality: 'low' | 'medium' | 'high';
  downloadQuality: 'low' | 'medium' | 'high';
  autoPlay: boolean;
  crossfade: boolean;
  crossfadeDuration: number;
  gapless: boolean;
  normalize: boolean;
  showLyrics: boolean;
  miniPlayerStyle: 'compact' | 'expanded';
  language: string;
  dataSaver: boolean;
}

// ---- YouTube API Response Types ----

export interface YouTubeSearchResult {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  items: YouTubeSearchItem[];
}

export interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: YouTubeResourceId;
  snippet: YouTubeSnippet;
}

export interface YouTubeResourceId {
  kind: string;
  videoId?: string;
  channelId?: string;
  playlistId?: string;
}

export interface YouTubeSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
}

export interface YouTubeThumbnails {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface YouTubeVideoDetail {
  kind: string;
  etag: string;
  items: YouTubeVideoItem[];
}

export interface YouTubeVideoItem {
  kind: string;
  etag: string;
  id: string;
  snippet: YouTubeSnippet & {
    tags?: string[];
    categoryId?: string;
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount: string;
  };
}

export interface YouTubeChannelDetail {
  kind: string;
  etag: string;
  items: YouTubeChannelItem[];
}

export interface YouTubeChannelItem {
  kind: string;
  etag: string;
  id: string;
  snippet: YouTubeSnippet & {
    customUrl?: string;
    localized?: {
      title: string;
      description: string;
    };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export interface YouTubePlaylistDetail {
  kind: string;
  etag: string;
  items: YouTubePlaylistItem[];
}

export interface YouTubePlaylistItem {
  kind: string;
  etag: string;
  id: string;
  snippet: YouTubeSnippet & {
    channelId: string;
    channelTitle: string;
    playlistId: string;
    position: number;
    resourceId: YouTubeResourceId;
  };
  contentDetails?: {
    videoId: string;
    note: string;
    videoPublishedAt: string;
  };
}

// ---- Navigation Types ----

export type TabName = 'home' | 'search' | 'library' | 'profile' | 'explore' | 'new-releases' | 'history' | 'stats' | 'listen-together' | 'backup' | 'settings';
