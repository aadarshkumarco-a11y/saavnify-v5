'use client';

/**
 * Saavnify v5 — Style Variants
 *
 * Exports 4 home styles (Classic, Playful, Neon, Spotify) and 3 library
 * styles (Classic, Playful, Neon), plus two dispatcher components:
 *   <HomeVariant style="classic" />
 *   <LibraryVariant style="neon" />
 *
 * Each variant fetches its own data via the same real-data hooks used by
 * the existing HomeTab / LibraryTab (getAggregatedTrending, getBollywoodHits,
 * getPunjabiHits, getNewReleasesIndia from @/lib/music-aggregator, and the
 * Zustand useLibraryStore for liked songs / playlists / history).
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Heart,
  Clock,
  ListMusic,
  Plus,
  Search,
  TrendingUp,
  Music,
  Music2,
  User,
  Radio,
  Sparkles,
  Flame,
  Disc3,
  Mic2,
  ChevronRight,
  MoreHorizontal,
  Shuffle,
  Trash2,
  Pencil,
  Pin,
  Download,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';
import { useUserStore } from '@/stores/user-store';
import {
  getAggregatedTrending,
  getBollywoodHits,
  getPunjabiHits,
  getNewReleasesIndia,
} from '@/lib/music-aggregator';
import { formatDuration } from '@/lib/youtube-api';
import { CreatePlaylistDialog } from '@/components/library/create-playlist-dialog';
import type { Track, Playlist, Artist } from '@/types';

// ============================================================================
// Shared helpers
// ============================================================================

type HomeStyle = 'classic' | 'playful' | 'neon' | 'spotify';
type LibraryStyle = 'classic' | 'playful' | 'neon';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getDateString(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Image with graceful fallback to a music icon. */
function TrackImage({
  src,
  alt,
  className,
  fillMode = false,
  fallbackSize = 18,
}: {
  src?: string;
  alt: string;
  className?: string;
  fillMode?: boolean;
  fallbackSize?: number;
}) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`${className ?? ''} bg-[#282828] flex items-center justify-center`}>
        <Music2 size={fallbackSize} className="text-[#1DB954]/70" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`${className ?? ''} ${fillMode ? 'absolute inset-0 w-full h-full' : ''}`}
      onError={() => setError(true)}
      loading="lazy"
      decoding="async"
    />
  );
}

/** Intersection-observer lazy section. */
function useInView(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ---- Indian Music Mood Pills ----
const MOODS = [
  { id: 'bollywood', label: 'Bollywood', emoji: '🎬' },
  { id: 'punjabi', label: 'Punjabi', emoji: '🪘' },
  { id: 'romantic', label: 'Romantic', emoji: '💕' },
  { id: 'lofi', label: 'Lo-Fi', emoji: '🎹' },
  { id: 'workout', label: 'Workout', emoji: '💪' },
  { id: 'devotional', label: 'Devotional', emoji: '🙏' },
  { id: 'party', label: 'Party', emoji: '🎉' },
  { id: 'retro', label: 'Retro', emoji: '📻' },
];

// ---- Quick play data used by several variants ----
const QUICK_PLAY_ITEMS = [
  { id: 'liked', title: 'Liked Songs', icon: Heart, color: '#7C3AED' },
  { id: 'recent', title: 'Recently Played', icon: Clock, color: '#E11D48' },
  { id: 'daily', title: 'Daily Mix', icon: Sparkles, color: '#1DB954' },
];

// ---- Default fallback artists ----
const DEFAULT_ARTISTS: Artist[] = [
  { id: 'def-1', channelId: 'arijit-singh', name: 'Arijit Singh', thumbnail: '' },
  { id: 'def-2', channelId: 'pritam', name: 'Pritam', thumbnail: '' },
  { id: 'def-3', channelId: 'ap-dhillon', name: 'AP Dhillon', thumbnail: '' },
  { id: 'def-4', channelId: 'shreya-ghoshal', name: 'Shreya Ghoshal', thumbnail: '' },
  { id: 'def-5', channelId: 'sonu-nigam', name: 'Sonu Nigam', thumbnail: '' },
  { id: 'def-6', channelId: 'neha-kakkar', name: 'Neha Kakkar', thumbnail: '' },
];

// ---- Skeletons ----
function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex-shrink-0 w-36 ${className}`}>
      <Skeleton className="w-36 h-36 rounded-2xl" />
      <Skeleton className="h-3.5 w-28 mt-2.5 rounded-full" />
      <Skeleton className="h-2.5 w-20 mt-1.5 rounded-full" />
    </div>
  );
}

function CardRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---- Data hook: pulls real home data via the same aggregator as HomeTab ----
interface HomeData {
  trending: Track[];
  bollywood: Track[];
  punjabi: Track[];
  newReleases: Track[];
  loading: {
    trending: boolean;
    bollywood: boolean;
    punjabi: boolean;
    newReleases: boolean;
  };
  error: string | null;
  refresh: () => void;
}

function useHomeData(): HomeData {
  const [trending, setTrending] = useState<Track[]>([]);
  const [bollywood, setBollywood] = useState<Track[]>([]);
  const [punjabi, setPunjabi] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [loading, setLoading] = useState({
    trending: true,
    bollywood: true,
    punjabi: true,
    newReleases: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Internal: kick off the async fetches. setState calls only happen inside
  // async callbacks (.then/.catch/.finally), so this is safe to call from
  // a useEffect body without tripping react-hooks/set-state-in-effect.
  const runFetches = useCallback(() => {
    getAggregatedTrending(20)
      .then((t) => {
        setTrending(t);
        if (t.length === 0) setError('No content available right now.');
      })
      .catch(() => setError('Failed to load trending music'))
      .finally(() => setLoading((l) => ({ ...l, trending: false })));

    getBollywoodHits(15)
      .then(setBollywood)
      .catch(() => {})
      .finally(() => setLoading((l) => ({ ...l, bollywood: false })));

    getPunjabiHits(15)
      .then(setPunjabi)
      .catch(() => {})
      .finally(() => setLoading((l) => ({ ...l, punjabi: false })));

    getNewReleasesIndia(15)
      .then(setNewReleases)
      .catch(() => {})
      .finally(() => setLoading((l) => ({ ...l, newReleases: false })));
  }, []);

  // Initial load — initial useState already has loading=true, error=null,
  // so we only need to start the async fetches.
  useEffect(() => {
    runFetches();
  }, [runFetches]);

  // Refresh handler — called from event handlers (Retry buttons), so it's
  // safe to synchronously reset loading/error here.
  const refresh = useCallback(() => {
    setLoading({ trending: true, bollywood: true, punjabi: true, newReleases: true });
    setError(null);
    runFetches();
  }, [runFetches]);

  return { trending, bollywood, punjabi, newReleases, loading, error, refresh };
}

// ---- Empty state ----
function EmptyBlock({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl bg-[#181818]">
      <div className="w-16 h-16 rounded-full bg-[#282828] flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-white font-semibold text-sm">{title}</p>
      <p className="text-[#727272] text-xs mt-1 max-w-[240px]">{subtitle}</p>
    </div>
  );
}

// ============================================================================
// CLASSIC HOME
// ============================================================================

export function ClassicHome() {
  const { trending, bollywood, punjabi, newReleases, loading, error, refresh } = useHomeData();
  const { playQueue, play } = usePlayerStore();
  const { likedSongs, history, addToHistory } = useLibraryStore();

  const greeting = getGreeting();
  const recentTracks = useMemo(() => history.slice(0, 10).map((h) => h.track), [history]);

  const handlePlay = (track: Track, index: number, list: Track[]) => {
    playQueue(list, index, 'home:classic');
    addToHistory(track);
  };

  const handlePlaySingle = (track: Track) => {
    play(track, 'home:classic');
    addToHistory(track);
  };

  const quickPlayCards = [
    ...QUICK_PLAY_ITEMS.map((item) => {
      let subtitle = '';
      let thumbnail = '';
      let tracks: Track[] = [];
      if (item.id === 'liked') {
        subtitle = `${likedSongs.length} songs`;
        tracks = likedSongs;
      } else if (item.id === 'recent') {
        subtitle = `${recentTracks.length} songs`;
        tracks = recentTracks;
        thumbnail = recentTracks[0]?.thumbnail || '';
      } else {
        subtitle = 'Made for you';
        tracks = trending.slice(0, 15);
      }
      return { ...item, subtitle, thumbnail, tracks };
    }),
    ...trending.slice(0, 3).map((track, i) => ({
      id: `trending-${i}`,
      title: truncate(track.title, 20),
      subtitle: truncate(track.artist, 16),
      thumbnail: track.thumbnail,
      tracks: [track],
      icon: TrendingUp,
      color: '#1DB954',
    })),
  ];

  return (
    <div className="px-4 pt-[env(safe-area-inset-top)] pb-28 bg-[#090909] min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between py-4 sticky top-0 z-10 bg-[#090909]/90 backdrop-blur-lg"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}</h1>
          <p className="text-xs text-[#727272] mt-0.5">{getDateString()}</p>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-[#181818] transition-colors"
            aria-label="Search"
          >
            <Search size={20} className="text-[#B3B3B3]" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-[#181818] transition-colors"
            aria-label="More"
          >
            <MoreHorizontal size={20} className="text-[#B3B3B3]" />
          </motion.button>
        </div>
      </motion.header>

      {/* Quick play row */}
      <section className="mb-7">
        {loading.trending ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-[#181818] rounded-2xl overflow-hidden h-14"
              >
                <Skeleton className="w-14 h-14 rounded-none" />
                <div className="flex-1 pr-3 space-y-1.5">
                  <Skeleton className="h-3 w-3/4 rounded-full" />
                  <Skeleton className="h-2.5 w-1/2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {quickPlayCards.slice(0, 6).map((card) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.id}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    if (card.tracks.length > 0) {
                      playQueue(card.tracks, 0, 'home:classic:quick');
                      addToHistory(card.tracks[0]);
                    }
                  }}
                  className="flex items-center gap-2 bg-[#181818] hover:bg-[#222] rounded-2xl overflow-hidden transition-colors group h-14"
                >
                  {card.thumbnail ? (
                    <div className="w-14 h-14 flex-shrink-0 relative overflow-hidden">
                      <TrackImage
                        src={card.thumbnail}
                        alt={card.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: card.color }}
                    >
                      <Icon size={18} className="text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-semibold text-white truncate">{card.title}</p>
                    <p className="text-[10px] text-[#B3B3B3] truncate">{card.subtitle}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      {/* Trending */}
      <ClassicSection
        title="Trending India"
        icon={<TrendingUp size={20} className="text-[#1DB954]" />}
        tracks={trending}
        loading={loading.trending}
        onPlayTrack={(t, i) => handlePlay(t, i, trending)}
        badge="Live"
      />
      {error && !loading.trending && (
        <div className="text-center py-4 bg-[#181818] rounded-2xl mb-6">
          <p className="text-[#B3B3B3] text-sm">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 px-4 py-2 bg-[#1DB954] text-white text-sm rounded-full"
          >
            Retry
          </button>
        </div>
      )}

      {/* Bollywood */}
      <ClassicSection
        title="Bollywood Hits"
        icon={<Flame size={20} className="text-[#FF6B35]" />}
        tracks={bollywood}
        loading={loading.bollywood}
        onPlayTrack={(t, i) => handlePlay(t, i, bollywood)}
      />

      {/* Punjabi */}
      <ClassicSection
        title="Punjabi Hits"
        icon={<Music2 size={20} className="text-[#FFB800]" />}
        tracks={punjabi}
        loading={loading.punjabi}
        onPlayTrack={(t, i) => handlePlay(t, i, punjabi)}
      />

      {/* Mood browser */}
      <section className="mb-7">
        <h2 className="text-lg font-bold text-white mb-3">Browse by Mood</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] hover:bg-[#282828] transition-colors border border-[#282828]/50"
            >
              <span className="text-sm">{mood.emoji}</span>
              <span className="text-xs font-medium text-white whitespace-nowrap">{mood.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Continue listening */}
      <section className="mb-7">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={18} className="text-[#1DB954]" />
          <h2 className="text-lg font-bold text-white">Continue Listening</h2>
        </div>
        {recentTracks.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {recentTracks.map((track, i) => (
              <motion.button
                key={`${track.id}-${i}`}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => handlePlaySingle(track)}
                className="flex-shrink-0 w-44 text-left"
              >
                <div className="flex items-center gap-3 bg-[#181818] rounded-2xl p-2 pr-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <TrackImage
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {truncate(track.title, 20)}
                    </p>
                    <p className="text-[10px] text-[#B3B3B3] truncate">
                      {truncate(track.artist, 16)}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={<Music2 size={28} className="text-[#282828]" />}
            title="No recently played"
            subtitle="Start listening to build your history"
          />
        )}
      </section>

      {/* Favorite artists */}
      <section className="mb-7">
        <h2 className="text-lg font-bold text-white mb-3">Favorite Artists</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {(useUserStore.getState().favoriteArtists.length > 0
            ? useUserStore.getState().favoriteArtists
            : DEFAULT_ARTISTS
          ).map((artist) => (
            <button
              key={artist.channelId}
              className="flex-shrink-0 flex flex-col items-center gap-2 w-20"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#282828] flex items-center justify-center">
                {artist.thumbnail ? (
                  <img
                    src={artist.thumbnail}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-[#727272]" />
                )}
              </div>
              <p className="text-[11px] font-medium text-white text-center truncate w-full">
                {truncate(artist.name, 12)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* New releases */}
      <ClassicSection
        title="New Releases India"
        icon={<Sparkles size={20} className="text-[#1DB954]" />}
        tracks={newReleases}
        loading={loading.newReleases}
        onPlayTrack={(t, i) => handlePlay(t, i, newReleases)}
      />
    </div>
  );
}

function ClassicSection({
  title,
  icon,
  tracks,
  loading,
  onPlayTrack,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  tracks: Track[];
  loading: boolean;
  onPlayTrack: (track: Track, index: number) => void;
  badge?: string;
}) {
  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {badge && (
            <span className="text-[10px] text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <button className="text-xs text-[#B3B3B3] hover:text-white flex items-center gap-0.5">
          See all <ChevronRight size={14} />
        </button>
      </div>
      {loading ? (
        <CardRowSkeleton />
      ) : tracks.length === 0 ? (
        <EmptyBlock
          icon={<Music2 size={28} className="text-[#282828]" />}
          title="Nothing here yet"
          subtitle="Check back later for fresh picks."
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory">
          {tracks.slice(0, 10).map((track, index) => (
            <motion.button
              key={track.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPlayTrack(track, index)}
              className="flex-shrink-0 w-36 text-left group snap-start"
            >
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-lg">
                <TrackImage
                  src={track.thumbnail}
                  alt={track.title}
                  fillMode
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 flex items-end justify-end p-2">
                  <div className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    <Play size={16} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-white truncate mt-2">
                {truncate(track.title, 24)}
              </p>
              <p className="text-xs text-[#B3B3B3] truncate">{truncate(track.artist, 20)}</p>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// PLAYFUL HOME
// ============================================================================

const PLAYFUL_GRADIENTS = [
  'from-pink-400 to-purple-500',
  'from-purple-400 to-fuchsia-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-sky-400 to-indigo-400',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-blue-400',
];

const PLAYFUL_EMOJIS = ['🎵', '🔥', '✨', '💫', '🌟', '🎶', '🎸', '🎤'];

function gradientFor(i: number) {
  return PLAYFUL_GRADIENTS[i % PLAYFUL_GRADIENTS.length];
}

export function PlayfulHome() {
  const { trending, bollywood, punjabi, newReleases, loading } = useHomeData();
  const { playQueue, play } = usePlayerStore();
  const { likedSongs, history, addToHistory } = useLibraryStore();

  const greeting = getGreeting();
  const recentTracks = useMemo(() => history.slice(0, 10).map((h) => h.track), [history]);

  const handlePlay = (track: Track, index: number, list: Track[]) => {
    playQueue(list, index, 'home:playful');
    addToHistory(track);
  };
  const handlePlaySingle = (track: Track) => {
    play(track, 'home:playful');
    addToHistory(track);
  };

  // Build colorful "Made for you" tiles by mixing bollywood/punjabi/new releases
  const madeForYou = useMemo(() => {
    const tiles = [
      { title: 'Bollywood Party 🎉', tracks: bollywood, grad: gradientFor(0) },
      { title: 'Punjabi Beats 🪘', tracks: punjabi, grad: gradientFor(2) },
      { title: 'Fresh Drops ✨', tracks: newReleases, grad: gradientFor(3) },
      { title: 'Trending Now 🔥', tracks: trending, grad: gradientFor(4) },
    ];
    return tiles.filter((t) => t.tracks.length > 0);
  }, [bollywood, punjabi, newReleases, trending]);

  return (
    <div className="px-4 pt-[env(safe-area-inset-top)] pb-28 bg-gradient-to-b from-fuchsia-950/30 via-[#0a0a0a] to-[#0a0a0a] min-h-screen">
      {/* Playful header */}
      <motion.header
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="pt-6 pb-4"
      >
        <p className="text-xs text-pink-300/80 font-medium">🎵 {getDateString()}</p>
        <h1 className="text-3xl font-black text-white mt-1">
          {greeting}, <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">let's vibe!</span> ✨
        </h1>
      </motion.header>

      {/* "Jump back in" carousel */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Clock size={16} className="text-pink-400" /> Jump back in
        </h2>
        {recentTracks.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {recentTracks.slice(0, 8).map((track, i) => (
              <motion.button
                key={`${track.id}-${i}`}
                whileHover={{ scale: 1.02, rotate: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePlaySingle(track)}
                className={`flex-shrink-0 w-44 h-28 rounded-3xl p-3 flex flex-col justify-end bg-gradient-to-br ${gradientFor(i)} shadow-lg relative overflow-hidden`}
              >
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/20 blur-xl" />
                <div className="absolute top-2 right-2 w-10 h-10 rounded-2xl overflow-hidden shadow-lg">
                  <TrackImage
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-bold text-white drop-shadow truncate relative z-10">
                  {truncate(track.title, 22)}
                </p>
                <p className="text-[10px] text-white/80 truncate relative z-10">
                  {truncate(track.artist, 18)}
                </p>
              </motion.button>
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={<Sparkles size={28} className="text-pink-400/70" />}
            title="Pick a song to start the vibe"
            subtitle="Your recently played tracks will appear here as colorful cards."
          />
        )}
      </section>

      {/* "Made for you" colorful gradient tiles */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" /> Made for you 💜
        </h2>
        {madeForYou.length === 0 && (loading.bollywood || loading.punjabi || loading.newReleases) ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {madeForYou.map((tile, i) => (
              <motion.button
                key={tile.title}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (tile.tracks.length > 0) {
                    playQueue(tile.tracks, 0, 'home:playful:mfy');
                    addToHistory(tile.tracks[0]);
                  }
                }}
                className={`relative h-32 rounded-3xl p-4 text-left bg-gradient-to-br ${tile.grad} shadow-lg overflow-hidden`}
              >
                <span className="absolute top-2 right-3 text-2xl">
                  {PLAYFUL_EMOJIS[i % PLAYFUL_EMOJIS.length]}
                </span>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/15 blur-xl" />
                <p className="text-sm font-bold text-white drop-shadow mt-auto relative z-10">
                  {tile.title}
                </p>
                <p className="text-[10px] text-white/80 mt-0.5 relative z-10">
                  {tile.tracks.length} songs
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* Trending as colorful rounded cards */}
      <PlayfulSection
        title="Trending now"
        emoji="🔥"
        tracks={trending}
        loading={loading.trending}
        onPlay={(t, i) => handlePlay(t, i, trending)}
      />

      {/* Bollywood */}
      <PlayfulSection
        title="Bollywood hits"
        emoji="🎬"
        tracks={bollywood}
        loading={loading.bollywood}
        onPlay={(t, i) => handlePlay(t, i, bollywood)}
      />

      {/* Punjabi */}
      <PlayfulSection
        title="Punjabi bangers"
        emoji="🪘"
        tracks={punjabi}
        loading={loading.punjabi}
        onPlay={(t, i) => handlePlay(t, i, punjabi)}
      />

      {/* New releases */}
      <PlayfulSection
        title="Fresh drops"
        emoji="✨"
        tracks={newReleases}
        loading={loading.newReleases}
        onPlay={(t, i) => handlePlay(t, i, newReleases)}
      />
    </div>
  );
}

function PlayfulSection({
  title,
  emoji,
  tracks,
  loading,
  onPlay,
}: {
  title: string;
  emoji: string;
  tracks: Track[];
  loading: boolean;
  onPlay: (track: Track, index: number) => void;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h2>
      {loading ? (
        <CardRowSkeleton count={5} />
      ) : tracks.length === 0 ? (
        <EmptyBlock
          icon={<Music2 size={28} className="text-pink-400/60" />}
          title="Empty for now"
          subtitle="Try again in a moment."
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {tracks.slice(0, 10).map((track, index) => (
            <motion.button
              key={track.id}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPlay(track, index)}
              className="flex-shrink-0 w-36 text-left group"
            >
              <div
                className={`relative w-36 h-36 rounded-3xl overflow-hidden shadow-lg p-2 bg-gradient-to-br ${gradientFor(index)}`}
              >
                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                  <TrackImage
                    src={track.thumbnail}
                    alt={track.title}
                    fillMode
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-3xl" />
                <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <Play size={16} fill="#ec4899" className="text-pink-500 ml-0.5" />
                </div>
              </div>
              <p className="text-sm font-bold text-white truncate mt-2">
                {truncate(track.title, 22)}
              </p>
              <p className="text-xs text-[#B3B3B3] truncate">{truncate(track.artist, 20)}</p>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// NEON HOME
// ============================================================================

export function NeonHome() {
  const { trending, bollywood, punjabi, newReleases, loading, error, refresh } = useHomeData();
  const { playQueue, play } = usePlayerStore();
  const { likedSongs, history, addToHistory } = useLibraryStore();

  const greeting = getGreeting();
  const recentTracks = useMemo(() => history.slice(0, 10).map((h) => h.track), [history]);

  const handlePlay = (track: Track, index: number, list: Track[]) => {
    playQueue(list, index, 'home:neon');
    addToHistory(track);
  };
  const handlePlaySingle = (track: Track) => {
    play(track, 'home:neon');
    addToHistory(track);
  };

  return (
    <div className="relative px-4 pt-[env(safe-area-inset-top)] pb-28 bg-[#050505] min-h-screen font-mono overflow-hidden">
      {/* Scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff41 2px, #00ff41 3px)',
        }}
      />

      {/* System status bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between py-3 border-b border-[#00ff41]/20 mb-4"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse shadow-[0_0_8px_#00ff41]" />
          <span className="text-[10px] text-[#00ff41] tracking-[0.2em] uppercase">
            System Online
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#00d9ff] tracking-widest uppercase">
          <span>SAAVNIFY//V5</span>
          <span className="text-[#00ff41]/60">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
      </motion.div>

      {/* Glitch greeting */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 mb-6"
      >
        <p className="text-[10px] text-[#00d9ff] tracking-[0.3em] uppercase mb-1">
          &gt;_ user_session.init
        </p>
        <h1 className="text-4xl font-bold text-[#00ff41] tracking-tight">
          {greeting.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="inline-block"
              style={{
                textShadow: '0 0 8px #00ff41, 0 0 16px #00ff41',
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          ))}
        </h1>
        <p className="text-xs text-[#00ff41]/60 mt-1 tracking-wider">
          &gt;// {getDateString().toUpperCase()}
        </p>
      </motion.header>

      {/* Quick stats row (neon glow cards) */}
      <section className="relative z-10 grid grid-cols-3 gap-2 mb-6">
        <NeonStatCard
          label="LIKED"
          value={formatNumber(likedSongs.length)}
          icon={<Heart size={14} className="text-[#00ff41]" />}
        />
        <NeonStatCard
          label="RECENT"
          value={formatNumber(recentTracks.length)}
          icon={<Clock size={14} className="text-[#00d9ff]" />}
        />
        <NeonStatCard
          label="TRENDING"
          value={formatNumber(trending.length)}
          icon={<TrendingUp size={14} className="text-[#00ff41]" />}
        />
      </section>

      {/* Featured / Trending — horizontal neon glow cards */}
      <NeonSection
        title="FEATURED"
        tracks={trending}
        loading={loading.trending}
        onPlay={(t, i) => handlePlay(t, i, trending)}
      />
      {error && !loading.trending && (
        <div className="relative z-10 border border-[#00ff41]/30 rounded-xl p-3 mb-6 text-center">
          <p className="text-[#00ff41] text-xs">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 px-3 py-1 border border-[#00ff41] text-[#00ff41] text-[10px] tracking-widest uppercase hover:bg-[#00ff41]/10"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Bollywood */}
      <NeonSection
        title="BOLLYWOOD_FEED"
        tracks={bollywood}
        loading={loading.bollywood}
        onPlay={(t, i) => handlePlay(t, i, bollywood)}
      />

      {/* Punjabi */}
      <NeonSection
        title="PUNJABI_FEED"
        tracks={punjabi}
        loading={loading.punjabi}
        onPlay={(t, i) => handlePlay(t, i, punjabi)}
      />

      {/* Continue listening */}
      <section className="relative z-10 mb-6">
        <h2 className="text-sm font-bold text-[#00d9ff] tracking-[0.2em] uppercase mb-3">
          &gt;// RESUME_SESSION
        </h2>
        {recentTracks.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {recentTracks.slice(0, 8).map((track, i) => (
              <motion.button
                key={`${track.id}-${i}`}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handlePlaySingle(track)}
                className="flex-shrink-0 w-40 flex items-center gap-2 p-2 border border-[#00ff41]/30 rounded-xl bg-[#0a0a0a] hover:border-[#00ff41] hover:shadow-[0_0_12px_rgba(0,255,65,0.4)] transition-all"
              >
                <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-[#00ff41]/30">
                  <TrackImage
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#00ff41] truncate">
                    {truncate(track.title, 18)}
                  </p>
                  <p className="text-[9px] text-[#00ff41]/50 truncate">{truncate(track.artist, 14)}</p>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[#00ff41]/20 rounded-xl p-6 text-center">
            <p className="text-[#00ff41]/60 text-xs tracking-wider">{'// no previous session found'}</p>
          </div>
        )}
      </section>

      {/* New releases */}
      <NeonSection
        title="NEW_UPLOADS"
        tracks={newReleases}
        loading={loading.newReleases}
        onPlay={(t, i) => handlePlay(t, i, newReleases)}
      />
    </div>
  );
}

function NeonStatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative border border-[#00ff41]/30 rounded-xl p-2 bg-[#0a0a0a]">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[9px] text-[#00ff41]/70 tracking-widest uppercase">{label}</span>
      </div>
      <p
        className="text-xl font-bold text-[#00ff41]"
        style={{ textShadow: '0 0 8px #00ff41' }}
      >
        {value}
      </p>
    </div>
  );
}

function NeonSection({
  title,
  tracks,
  loading,
  onPlay,
}: {
  title: string;
  tracks: Track[];
  loading: boolean;
  onPlay: (track: Track, index: number) => void;
}) {
  return (
    <section className="relative z-10 mb-6">
      <h2
        className="text-sm font-bold text-[#00ff41] tracking-[0.2em] uppercase mb-3"
        style={{ textShadow: '0 0 6px rgba(0,255,65,0.6)' }}
      >
        &gt;// {title}
      </h2>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl bg-[#0a0a0a]" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="border border-dashed border-[#00ff41]/20 rounded-xl p-6 text-center">
          <p className="text-[#00ff41]/60 text-xs tracking-wider">{'// no data stream'}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
          {tracks.slice(0, 10).map((track, index) => (
            <motion.button
              key={track.id}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onPlay(track, index)}
              className="w-full flex items-center gap-3 p-2 border border-[#00ff41]/30 rounded-xl bg-[#0a0a0a] hover:border-[#00ff41] hover:shadow-[0_0_15px_rgba(0,255,65,0.35)] transition-all text-left"
            >
              <span className="text-[10px] text-[#00d9ff] font-bold w-6 text-center tracking-wider">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border border-[#00ff41]/30">
                <TrackImage
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#00ff41] truncate">{track.title}</p>
                <p className="text-[10px] text-[#00ff41]/50 truncate tracking-wider">
                  {track.artist}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full border border-[#00ff41] flex items-center justify-center flex-shrink-0 hover:bg-[#00ff41]/10">
                <Play size={12} fill="#00ff41" className="text-[#00ff41] ml-0.5" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// SPOTIFY HOME
// ============================================================================

export function SpotifyHome() {
  const { trending, bollywood, punjabi, newReleases, loading } = useHomeData();
  const { playQueue, play } = usePlayerStore();
  const { likedSongs, history, addToHistory } = useLibraryStore();

  const greeting = getGreeting();
  const recentTracks = useMemo(() => history.slice(0, 10).map((h) => h.track), [history]);

  const handlePlay = (track: Track, index: number, list: Track[]) => {
    playQueue(list, index, 'home:spotify');
    addToHistory(track);
  };
  const handlePlaySingle = (track: Track) => {
    play(track, 'home:spotify');
    addToHistory(track);
  };

  // 6 quick-pick tiles (2-col grid): liked, recent, plus 4 trending
  const quickPicks = useMemo(() => {
    const picks: Array<{
      id: string;
      title: string;
      subtitle: string;
      thumbnail?: string;
      icon: React.ReactNode;
      tracks: Track[];
      color: string;
    }> = [
      {
        id: 'liked',
        title: 'Liked Songs',
        subtitle: `${likedSongs.length} songs`,
        icon: <Heart size={18} fill="white" className="text-white" />,
        tracks: likedSongs,
        color: 'from-[#1DB954] to-[#148F3F]',
      },
      {
        id: 'recent',
        title: 'Recently Played',
        subtitle: `${recentTracks.length} songs`,
        thumbnail: recentTracks[0]?.thumbnail,
        icon: <Clock size={18} className="text-white" />,
        tracks: recentTracks,
        color: 'from-[#404040] to-[#282828]',
      },
    ];
    trending.slice(0, 4).forEach((t, i) => {
      picks.push({
        id: `t-${i}`,
        title: truncate(t.title, 22),
        subtitle: truncate(t.artist, 18),
        thumbnail: t.thumbnail,
        icon: <TrendingUp size={18} className="text-white" />,
        tracks: [t],
        color: 'from-[#282828] to-[#181818]',
      });
    });
    return picks.slice(0, 6);
  }, [likedSongs, recentTracks, trending]);

  return (
    <div className="px-4 pt-[env(safe-area-inset-top)] pb-28 bg-[#000] min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-5 sticky top-0 z-10 bg-black/90 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{greeting}</h1>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full bg-[#1a1a1a] hover:bg-[#282828] transition-colors"
              aria-label="Search"
            >
              <Search size={18} className="text-white" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full bg-[#1a1a1a] hover:bg-[#282828] transition-colors"
              aria-label="More"
            >
              <MoreHorizontal size={18} className="text-white" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* 6 quick-pick tiles */}
      <section className="mb-6">
        {loading.trending ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md bg-[#181818]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickPicks.map((pick) => (
              <motion.button
                key={pick.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (pick.tracks.length > 0) {
                    playQueue(pick.tracks, 0, 'home:spotify:quick');
                    addToHistory(pick.tracks[0]);
                  }
                }}
                className="flex items-center gap-3 bg-[#181818] hover:bg-[#282828] rounded-md overflow-hidden transition-colors group h-16"
              >
                {pick.thumbnail ? (
                  <div className="w-16 h-16 flex-shrink-0 relative overflow-hidden">
                    <TrackImage
                      src={pick.thumbnail}
                      alt={pick.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={`w-16 h-16 flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${pick.color}`}
                  >
                    {pick.icon}
                  </div>
                )}
                <p className="text-sm font-semibold text-white truncate flex-1 pr-2">
                  {pick.title}
                </p>
                <div className="mr-3 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                  <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                    <Play size={16} fill="black" className="text-black ml-0.5" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* Made for you */}
      <SpotifySection
        title="Made for you"
        tracks={bollywood}
        loading={loading.bollywood}
        onPlay={(t, i) => handlePlay(t, i, bollywood)}
      />

      {/* Recently played */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">Recently played</h2>
          <button className="text-xs text-[#B3B3B3] hover:text-white">See all</button>
        </div>
        {recentTracks.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {recentTracks.slice(0, 8).map((track, i) => (
              <motion.button
                key={`${track.id}-${i}`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePlaySingle(track)}
                className="flex-shrink-0 w-40 text-left group"
              >
                <div className="relative w-40 h-40 rounded-md overflow-hidden shadow-lg">
                  <TrackImage
                    src={track.thumbnail}
                    alt={track.title}
                    fillMode
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 flex items-end justify-end p-3">
                    <div className="w-11 h-11 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      <Play size={18} fill="black" className="text-black ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-white truncate mt-2">
                  {truncate(track.title, 22)}
                </p>
                <p className="text-xs text-[#B3B3B3] truncate">{truncate(track.artist, 20)}</p>
              </motion.button>
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={<Clock size={28} className="text-[#282828]" />}
            title="No recent plays"
            subtitle="Your listening history will appear here."
          />
        )}
      </section>

      {/* Trending */}
      <SpotifySection
        title="Trending now"
        tracks={trending}
        loading={loading.trending}
        onPlay={(t, i) => handlePlay(t, i, trending)}
      />

      {/* Punjabi */}
      <SpotifySection
        title="Punjabi hits"
        tracks={punjabi}
        loading={loading.punjabi}
        onPlay={(t, i) => handlePlay(t, i, punjabi)}
      />

      {/* New releases */}
      <SpotifySection
        title="New releases"
        tracks={newReleases}
        loading={loading.newReleases}
        onPlay={(t, i) => handlePlay(t, i, newReleases)}
      />
    </div>
  );
}

function SpotifySection({
  title,
  tracks,
  loading,
  onPlay,
}: {
  title: string;
  tracks: Track[];
  loading: boolean;
  onPlay: (track: Track, index: number) => void;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button className="text-xs text-[#B3B3B3] hover:text-white">Show all</button>
      </div>
      {loading ? (
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <Skeleton className="w-40 h-40 rounded-md bg-[#181818]" />
              <Skeleton className="h-3.5 w-28 mt-2 rounded-full" />
              <Skeleton className="h-2.5 w-20 mt-1.5 rounded-full" />
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <EmptyBlock
          icon={<Music2 size={28} className="text-[#282828]" />}
          title="Nothing to show"
          subtitle="Try refreshing in a moment."
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {tracks.slice(0, 10).map((track, index) => (
            <motion.button
              key={track.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPlay(track, index)}
              className="flex-shrink-0 w-40 text-left group bg-[#181818] hover:bg-[#282828] p-3 rounded-md transition-colors"
            >
              <div className="relative w-full aspect-square rounded-md overflow-hidden shadow-lg mb-3">
                <TrackImage
                  src={track.thumbnail}
                  alt={track.title}
                  fillMode
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 flex items-end justify-end p-3">
                  <div className="w-11 h-11 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    <Play size={18} fill="black" className="text-black ml-0.5" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-white truncate">
                {truncate(track.title, 20)}
              </p>
              <p className="text-xs text-[#B3B3B3] truncate">{truncate(track.artist, 20)}</p>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// CLASSIC LIBRARY
// ============================================================================

type LibTab = 'playlists' | 'liked' | 'history' | 'downloads';

export function ClassicLibrary() {
  const [activeTab, setActiveTab] = useState<LibTab>('playlists');
  const [showCreate, setShowCreate] = useState(false);

  const { playQueue, currentTrack, isPlaying } = usePlayerStore();
  const {
    likedSongs,
    playlists,
    history,
    pinnedPlaylists,
    togglePinPlaylist,
    createPlaylist,
    deletePlaylist,
    toggleLike,
    isLiked,
    unlikeSong,
    clearHistory,
    addToHistory,
  } = useLibraryStore();

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => {
      const aPin = pinnedPlaylists.includes(a.id) ? 0 : 1;
      const bPin = pinnedPlaylists.includes(b.id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      return b.updatedAt - a.updatedAt;
    });
  }, [playlists, pinnedPlaylists]);

  const handlePlayLiked = (i: number = 0) => {
    if (likedSongs.length > 0) {
      playQueue(likedSongs, i, 'library:classic:liked');
      addToHistory(likedSongs[i]);
    }
  };

  const tabs: { id: LibTab; label: string; icon: React.ReactNode }[] = [
    { id: 'playlists', label: 'Playlists', icon: <ListMusic size={14} /> },
    { id: 'liked', label: 'Liked', icon: <Heart size={14} /> },
    { id: 'history', label: 'History', icon: <Clock size={14} /> },
    { id: 'downloads', label: 'Downloads', icon: <Download size={14} /> },
  ];

  return (
    <div className="px-4 pt-[env(safe-area-inset-top)] pb-32 bg-[#090909] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 mb-4">
        <h1 className="text-2xl font-bold text-white">Your Library</h1>
        <motion.button
          onClick={() => setShowCreate(true)}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-full bg-[#181818] hover:bg-[#222222] transition-colors"
          aria-label="Create playlist"
        >
          <Plus size={18} className="text-[#1DB954]" />
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 no-scrollbar">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                active ? 'bg-[#1DB954] text-[#090909]' : 'bg-[#181818] text-[#B3B3B3] hover:bg-[#222]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ---- Playlists ---- */}
        {activeTab === 'playlists' && (
          <motion.div
            key="playlists"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {sortedPlaylists.length === 0 ? (
              <EmptyBlock
                icon={<ListMusic size={28} className="text-[#282828]" />}
                title="No playlists yet"
                subtitle="Create your first playlist to organize your favorite music."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sortedPlaylists.map((p) => (
                  <ClassicPlaylistCard
                    key={p.id}
                    playlist={p}
                    isPinned={pinnedPlaylists.includes(p.id)}
                    onPin={() => togglePinPlaylist(p.id)}
                    onDelete={() => deletePlaylist(p.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ---- Liked ---- */}
        {activeTab === 'liked' && (
          <motion.div
            key="liked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {likedSongs.length === 0 ? (
              <EmptyBlock
                icon={<Heart size={28} className="text-[#282828]" />}
                title="No liked songs"
                subtitle="Heart the songs you love and they'll appear here."
              />
            ) : (
              <>
                <div className="bg-gradient-to-b from-[#1DB954]/20 to-transparent rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1DB954] to-[#148F3F] flex items-center justify-center shadow-lg">
                      <Heart size={28} fill="white" className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Liked Songs</h2>
                      <p className="text-sm text-[#B3B3B3]">
                        {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => handlePlayLiked(0)}
                      whileTap={{ scale: 0.9 }}
                      className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg"
                      aria-label="Play all"
                    >
                      <Play size={20} fill="#090909" className="text-[#090909] ml-0.5" />
                    </motion.button>
                    <motion.button
                      onClick={() =>
                        likedSongs.length > 0 &&
                        playQueue([...likedSongs].sort(() => Math.random() - 0.5), 0, 'library:classic:shuffle')
                      }
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-full bg-[#282828] flex items-center justify-center"
                      aria-label="Shuffle"
                    >
                      <Shuffle size={16} className="text-white" />
                    </motion.button>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {likedSongs.map((track, index) => {
                    const playing = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer ${
                          playing ? 'bg-[#1DB954]/10' : 'hover:bg-[#181818]'
                        }`}
                        onClick={() => handlePlayLiked(index)}
                      >
                        <span className="w-6 text-center flex-shrink-0 text-xs text-[#727272]">
                          {playing && isPlaying ? '▶' : index + 1}
                        </span>
                        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                          <TrackImage
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              playing ? 'text-[#1DB954]' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="text-xs text-[#B3B3B3] truncate">{track.artist}</p>
                        </div>
                        <span className="text-xs text-[#727272] hidden sm:block">
                          {track.duration ? formatDuration(track.duration) : ''}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                          className="p-1.5 rounded-full hover:bg-[#282828] flex-shrink-0"
                          aria-label="Toggle like"
                        >
                          <Heart
                            size={14}
                            className={
                              isLiked(track.id) ? 'text-[#1DB954] fill-[#1DB954]' : 'text-[#727272]'
                            }
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ---- History ---- */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {history.length === 0 ? (
              <EmptyBlock
                icon={<Clock size={28} className="text-[#282828]" />}
                title="No listening history"
                subtitle="Play some music and your history will show up here."
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">Listening History</h2>
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#E91429] bg-[#E91429]/10 hover:bg-[#E91429]/20 transition-colors"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                  {history.map((entry) => {
                    const playing = currentTrack?.id === entry.track.id;
                    return (
                      <div
                        key={`${entry.songId}-${entry.playedAt}`}
                        onClick={() => playQueue([entry.track], 0, 'library:classic:history')}
                        className={`flex items-center gap-3 w-full p-2 rounded-xl cursor-pointer transition-colors ${
                          playing ? 'bg-[#1DB954]/10' : 'hover:bg-[#181818]'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                          <TrackImage
                            src={entry.track.thumbnail}
                            alt={entry.track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              playing ? 'text-[#1DB954]' : 'text-white'
                            }`}
                          >
                            {entry.track.title}
                          </p>
                          <p className="text-xs text-[#B3B3B3] truncate">{entry.track.artist}</p>
                        </div>
                        <span className="text-[10px] text-[#727272] flex-shrink-0">
                          {formatTimeAgo(entry.playedAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ---- Downloads ---- */}
        {activeTab === 'downloads' && (
          <motion.div
            key="downloads"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <EmptyBlock
              icon={<Download size={28} className="text-[#282828]" />}
              title="No downloads yet"
              subtitle="Download songs for offline listening and they'll appear here."
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePlaylistDialog open={showCreate} onOpenChange={setShowCreate} onCreate={createPlaylist} />
    </div>
  );
}

function ClassicPlaylistCard({
  playlist,
  isPinned,
  onPin,
  onDelete,
}: {
  playlist: Playlist;
  isPinned: boolean;
  onPin: () => void;
  onDelete: () => void;
}) {
  const gradients = [
    'from-[#1DB954]/40 to-[#181818]',
    'from-[#E91429]/30 to-[#181818]',
    'from-[#8B5CF6]/30 to-[#181818]',
    'from-[#F59E0B]/30 to-[#181818]',
    'from-[#EC4899]/30 to-[#181818]',
    'from-[#06B6D4]/30 to-[#181818]',
  ];
  const gradIdx = playlist.name.length % gradients.length;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      className="w-full text-left bg-[#181818] rounded-2xl p-3 hover:bg-[#222222] transition-colors group relative overflow-hidden"
    >
      <div
        className={`w-full aspect-square rounded-xl bg-gradient-to-br ${gradients[gradIdx]} flex items-center justify-center mb-3 relative overflow-hidden`}
      >
        {playlist.isSmart ? (
          <Sparkles size={36} className="text-[#1DB954]" />
        ) : (
          <ListMusic size={36} className="text-white/60" />
        )}
        {isPinned && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1">
            <Pin size={10} className="text-[#1DB954]" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center">
            <Play size={18} fill="#090909" className="text-[#090909] ml-0.5" />
          </div>
        </div>
      </div>
      <p className="text-sm font-medium text-white truncate mb-0.5">{playlist.name}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#B3B3B3]">
          {playlist.trackCount} {playlist.trackCount === 1 ? 'song' : 'songs'}
        </p>
        <div className="flex gap-1">
          <button
            onClick={onPin}
            className="p-1 rounded-full hover:bg-[#282828]"
            aria-label={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin
              size={12}
              className={isPinned ? 'text-[#1DB954] fill-[#1DB954]' : 'text-[#727272]'}
            />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-full hover:bg-[#282828]"
            aria-label="Delete"
          >
            <Trash2 size={12} className="text-[#727272]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PLAYFUL LIBRARY
// ============================================================================

const LIB_GRADIENTS = [
  'from-pink-400 to-rose-500',
  'from-purple-400 to-fuchsia-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-500',
];

const LIB_EMOJIS = ['🎵', '💖', '🌈', '✨', '🎀', '🌟', '🎈', '🦄'];

export function PlayfulLibrary() {
  const [activeTab, setActiveTab] = useState<LibTab>('playlists');
  const [showCreate, setShowCreate] = useState(false);

  const { playQueue, currentTrack } = usePlayerStore();
  const {
    likedSongs,
    playlists,
    history,
    pinnedPlaylists,
    togglePinPlaylist,
    createPlaylist,
    deletePlaylist,
    toggleLike,
    isLiked,
    clearHistory,
    addToHistory,
  } = useLibraryStore();

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => {
      const aPin = pinnedPlaylists.includes(a.id) ? 0 : 1;
      const bPin = pinnedPlaylists.includes(b.id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      return b.updatedAt - a.updatedAt;
    });
  }, [playlists, pinnedPlaylists]);

  const handlePlayLiked = (i: number = 0) => {
    if (likedSongs.length > 0) {
      playQueue(likedSongs, i, 'library:playful:liked');
      addToHistory(likedSongs[i]);
    }
  };

  const tabs: { id: LibTab; label: string; emoji: string }[] = [
    { id: 'playlists', label: 'Playlists', emoji: '🎵' },
    { id: 'liked', label: 'Liked', emoji: '💖' },
    { id: 'history', label: 'History', emoji: '⏰' },
    { id: 'downloads', label: 'Downloads', emoji: '📥' },
  ];

  return (
    <div className="px-4 pt-[env(safe-area-inset-top)] pb-32 bg-gradient-to-b from-fuchsia-950/30 via-[#0a0a0a] to-[#0a0a0a] min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-5 mb-4"
      >
        <h1 className="text-2xl font-black text-white">
          My{' '}
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">
            library
          </span>{' '}
          🎀
        </h1>
        <motion.button
          onClick={() => setShowCreate(true)}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          className="px-4 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center gap-1.5 text-white text-sm font-bold shadow-lg shadow-pink-500/30"
        >
          <Plus size={16} /> New
        </motion.button>
      </motion.div>

      {/* Colorful pill tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 no-scrollbar">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.04 }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                active
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-[#181818] text-[#B3B3B3] hover:text-white'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ---- Playlists ---- */}
        {activeTab === 'playlists' && (
          <motion.div
            key="playlists"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {sortedPlaylists.length === 0 ? (
              <div className="rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 p-8 text-center">
                <span className="text-5xl">🎈</span>
                <p className="text-white font-bold text-lg mt-3">No playlists yet!</p>
                <p className="text-pink-200/70 text-sm mt-1">Tap "New" to create your first one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sortedPlaylists.map((p, i) => (
                  <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.03, rotate: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      // No detail view wired here; let parent route handle.
                    }}
                    className={`relative aspect-square rounded-3xl p-4 text-left bg-gradient-to-br ${LIB_GRADIENTS[i % LIB_GRADIENTS.length]} shadow-lg overflow-hidden flex flex-col`}
                  >
                    <span className="absolute top-3 right-3 text-3xl drop-shadow-lg">
                      {LIB_EMOJIS[i % LIB_EMOJIS.length]}
                    </span>
                    {pinnedPlaylists.includes(p.id) && (
                      <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-sm rounded-full p-1">
                        <Pin size={10} className="text-white fill-white" />
                      </div>
                    )}
                    <div className="mt-auto">
                      <p className="text-sm font-black text-white drop-shadow truncate">{p.name}</p>
                      <p className="text-[10px] text-white/80 mt-0.5">
                        {p.trackCount} {p.trackCount === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinPlaylist(p.id);
                        }}
                        className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Pin size={12} className="text-white" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist(p.id);
                        }}
                        className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Trash2 size={12} className="text-white" />
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ---- Liked ---- */}
        {activeTab === 'liked' && (
          <motion.div
            key="liked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Big heart-gradient hero card */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="relative rounded-3xl p-6 mb-5 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-500 shadow-xl shadow-pink-500/30 overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 text-9xl opacity-30">💖</div>
              <div className="relative z-10">
                <Heart size={36} fill="white" className="text-white mb-3" />
                <h2 className="text-2xl font-black text-white">Liked Songs</h2>
                <p className="text-sm text-white/80 mt-1">
                  {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'} you love 💕
                </p>
                {likedSongs.length > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePlayLiked(0)}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-pink-600 font-bold text-sm shadow-lg"
                  >
                    <Play size={14} fill="currentColor" /> Play all
                  </motion.button>
                )}
              </div>
            </motion.div>

            {likedSongs.length === 0 ? (
              <div className="rounded-3xl bg-[#181818] p-8 text-center">
                <span className="text-5xl">💔</span>
                <p className="text-white font-bold text-lg mt-3">No liked songs yet</p>
                <p className="text-[#B3B3B3] text-sm mt-1">
                  Tap the heart on any song to add it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {likedSongs.map((track, index) => {
                  const playing = currentTrack?.id === track.id;
                  return (
                    <motion.div
                      key={track.id}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ x: 2 }}
                      onClick={() => handlePlayLiked(index)}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                        playing ? 'bg-pink-500/20' : 'bg-[#181818] hover:bg-[#222]'
                      }`}
                    >
                      <span className="w-6 text-center text-xs font-bold text-pink-400">
                        {index + 1}
                      </span>
                      <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0">
                        <TrackImage
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${playing ? 'text-pink-400' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-[#B3B3B3] truncate">{track.artist}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track);
                        }}
                        className="p-2 rounded-full hover:bg-[#282828] flex-shrink-0"
                        aria-label="Toggle like"
                      >
                        <Heart size={16} className="text-pink-500 fill-pink-500" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ---- History ---- */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {history.length === 0 ? (
              <div className="rounded-3xl bg-[#181818] p-8 text-center">
                <span className="text-5xl">⏰</span>
                <p className="text-white font-bold text-lg mt-3">No history yet</p>
                <p className="text-[#B3B3B3] text-sm mt-1">Your recently played tracks will show up here.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-black text-white">Recently played ⏰</h2>
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                  {history.map((entry) => {
                    const playing = currentTrack?.id === entry.track.id;
                    return (
                      <motion.div
                        key={`${entry.songId}-${entry.playedAt}`}
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ x: 2 }}
                        onClick={() => playQueue([entry.track], 0, 'library:playful:history')}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                          playing ? 'bg-pink-500/20' : 'bg-[#181818] hover:bg-[#222]'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0">
                          <TrackImage
                            src={entry.track.thumbnail}
                            alt={entry.track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${playing ? 'text-pink-400' : 'text-white'}`}>
                            {entry.track.title}
                          </p>
                          <p className="text-xs text-[#B3B3B3] truncate">{entry.track.artist}</p>
                        </div>
                        <span className="text-[10px] text-[#727272] flex-shrink-0">
                          {formatTimeAgo(entry.playedAt)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ---- Downloads ---- */}
        {activeTab === 'downloads' && (
          <motion.div
            key="downloads"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-3xl bg-[#181818] p-8 text-center">
              <span className="text-5xl">📥</span>
              <p className="text-white font-bold text-lg mt-3">No downloads yet</p>
              <p className="text-[#B3B3B3] text-sm mt-1">Download songs to listen offline.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePlaylistDialog open={showCreate} onOpenChange={setShowCreate} onCreate={createPlaylist} />
    </div>
  );
}

// ============================================================================
// NEON LIBRARY
// ============================================================================

export function NeonLibrary() {
  const [activeTab, setActiveTab] = useState<LibTab>('playlists');
  const [showCreate, setShowCreate] = useState(false);

  const { playQueue, currentTrack } = usePlayerStore();
  const {
    likedSongs,
    playlists,
    history,
    pinnedPlaylists,
    togglePinPlaylist,
    createPlaylist,
    deletePlaylist,
    clearHistory,
    addToHistory,
  } = useLibraryStore();

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => {
      const aPin = pinnedPlaylists.includes(a.id) ? 0 : 1;
      const bPin = pinnedPlaylists.includes(b.id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      return b.updatedAt - a.updatedAt;
    });
  }, [playlists, pinnedPlaylists]);

  const handlePlayLiked = (i: number = 0) => {
    if (likedSongs.length > 0) {
      playQueue(likedSongs, i, 'library:neon:liked');
      addToHistory(likedSongs[i]);
    }
  };

  const tabs: { id: LibTab; label: string }[] = [
    { id: 'playlists', label: 'PLAYLISTS' },
    { id: 'liked', label: 'LIKED' },
    { id: 'history', label: 'HISTORY' },
    { id: 'downloads', label: 'DOWNLOADS' },
  ];

  return (
    <div className="relative px-4 pt-[env(safe-area-inset-top)] pb-32 bg-[#050505] min-h-screen font-mono overflow-hidden">
      {/* Scanlines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff41 2px, #00ff41 3px)',
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between pt-5 mb-2"
      >
        <h1
          className="text-2xl font-bold text-[#00ff41] tracking-widest"
          style={{ textShadow: '0 0 10px #00ff41' }}
        >
          &gt;// LIBRARY
        </h1>
        <motion.button
          onClick={() => setShowCreate(true)}
          whileTap={{ scale: 0.9 }}
          className="px-4 h-10 rounded-full border border-[#00ff41] text-[#00ff41] text-xs tracking-widest uppercase flex items-center gap-1.5 hover:bg-[#00ff41]/10 hover:shadow-[0_0_12px_rgba(0,255,65,0.4)] transition-all"
        >
          <Plus size={14} /> New
        </motion.button>
      </motion.div>

      <p className="relative z-10 text-[10px] text-[#00d9ff] tracking-[0.2em] uppercase mb-4">
        user.archive://session
      </p>

      {/* Neon-outline pill tabs */}
      <div className="relative z-10 flex gap-2 overflow-x-auto pb-3 mb-5 -mx-4 px-4 no-scrollbar">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${
                active
                  ? 'bg-[#00ff41] text-[#050505] shadow-[0_0_12px_rgba(0,255,65,0.6)]'
                  : 'border border-[#00ff41]/40 text-[#00ff41] hover:border-[#00ff41] hover:shadow-[0_0_8px_rgba(0,255,65,0.3)]'
              }`}
            >
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ---- Playlists ---- */}
        {activeTab === 'playlists' && (
          <motion.div
            key="playlists"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            {sortedPlaylists.length === 0 ? (
              <div className="border border-dashed border-[#00ff41]/30 rounded-xl p-8 text-center">
                <p className="text-[#00ff41]/70 text-sm tracking-wider">
                  &gt;// no playlists found in archive
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sortedPlaylists.map((p) => (
                  <NeonPlaylistCard
                    key={p.id}
                    playlist={p}
                    isPinned={pinnedPlaylists.includes(p.id)}
                    onPin={() => togglePinPlaylist(p.id)}
                    onDelete={() => deletePlaylist(p.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ---- Liked ---- */}
        {activeTab === 'liked' && (
          <motion.div
            key="liked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            {/* Liked counter with text-glow-green */}
            <div className="border border-[#00ff41]/40 rounded-xl p-4 mb-4 bg-[#0a0a0a]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#00ff41]/70 tracking-widest uppercase">
                    Liked tracks
                  </p>
                  <p
                    className="text-4xl font-bold text-[#00ff41] mt-1"
                    style={{ textShadow: '0 0 12px #00ff41' }}
                  >
                    {String(likedSongs.length).padStart(3, '0')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Heart size={28} className="text-[#00ff41] fill-[#00ff41]" />
                  {likedSongs.length > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handlePlayLiked(0)}
                      className="px-4 h-9 rounded-full bg-[#00ff41] text-[#050505] text-xs font-bold tracking-widest flex items-center gap-1.5"
                    >
                      <Play size={12} fill="currentColor" /> PLAY
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {likedSongs.length === 0 ? (
              <div className="border border-dashed border-[#00ff41]/30 rounded-xl p-8 text-center">
                <p className="text-[#00ff41]/70 text-sm tracking-wider">
                  &gt;// no liked tracks found
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar pr-1">
                {likedSongs.map((track, index) => {
                  const playing = currentTrack?.id === track.id;
                  return (
                    <motion.div
                      key={track.id}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handlePlayLiked(index)}
                      className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all ${
                        playing
                          ? 'border-[#00ff41] bg-[#00ff41]/10 shadow-[0_0_10px_rgba(0,255,65,0.3)]'
                          : 'border-[#00ff41]/20 bg-[#0a0a0a] hover:border-[#00ff41]/60'
                      }`}
                    >
                      <span className="text-[10px] text-[#00d9ff] font-bold w-6 text-center tracking-wider">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-[#00ff41]/30">
                        <TrackImage
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium truncate ${
                            playing ? 'text-[#00ff41]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[10px] text-[#00ff41]/50 truncate tracking-wider">
                          {track.artist}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ---- History ---- */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            {history.length === 0 ? (
              <div className="border border-dashed border-[#00ff41]/30 rounded-xl p-8 text-center">
                <p className="text-[#00ff41]/70 text-sm tracking-wider">
                  &gt;// history buffer empty
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-[#00d9ff] tracking-widest uppercase">
                    &gt;// session_log ({history.length})
                  </p>
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#E91429] border border-[#E91429]/40 hover:bg-[#E91429]/10"
                  >
                    <Trash2 size={12} /> Wipe
                  </button>
                </div>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar pr-1">
                  {history.map((entry) => {
                    const playing = currentTrack?.id === entry.track.id;
                    return (
                      <motion.div
                        key={`${entry.songId}-${entry.playedAt}`}
                        whileHover={{ x: 2 }}
                        onClick={() => playQueue([entry.track], 0, 'library:neon:history')}
                        className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all ${
                          playing
                            ? 'border-[#00ff41] bg-[#00ff41]/10'
                            : 'border-[#00ff41]/20 bg-[#0a0a0a] hover:border-[#00ff41]/60'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-[#00ff41]/30">
                          <TrackImage
                            src={entry.track.thumbnail}
                            alt={entry.track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${playing ? 'text-[#00ff41]' : 'text-white'}`}>
                            {entry.track.title}
                          </p>
                          <p className="text-[10px] text-[#00ff41]/50 truncate tracking-wider">
                            {entry.track.artist}
                          </p>
                        </div>
                        <span className="text-[9px] text-[#00d9ff] flex-shrink-0 tracking-wider">
                          {formatTimeAgo(entry.playedAt).toUpperCase()}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ---- Downloads ---- */}
        {activeTab === 'downloads' && (
          <motion.div
            key="downloads"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            <div className="border border-dashed border-[#00ff41]/30 rounded-xl p-8 text-center">
              <Download size={32} className="text-[#00ff41]/60 mx-auto mb-3" />
              <p className="text-[#00ff41]/70 text-sm tracking-wider">
                &gt;// offline buffer empty
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePlaylistDialog open={showCreate} onOpenChange={setShowCreate} onCreate={createPlaylist} />
    </div>
  );
}

function NeonPlaylistCard({
  playlist,
  isPinned,
  onPin,
  onDelete,
}: {
  playlist: Playlist;
  isPinned: boolean;
  onPin: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative border border-[#00ff41]/30 rounded-xl p-3 bg-[#0a0a0a] hover:border-[#00ff41] hover:shadow-[0_0_14px_rgba(0,255,65,0.35)] transition-all"
    >
      <div className="w-full aspect-square rounded-lg border border-[#00ff41]/30 flex items-center justify-center mb-3 relative overflow-hidden bg-gradient-to-br from-[#00ff41]/10 to-transparent">
        {playlist.isSmart ? (
          <Sparkles size={32} className="text-[#00ff41]" />
        ) : (
          <ListMusic size={32} className="text-[#00ff41]/70" />
        )}
        {isPinned && (
          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
            <Pin size={10} className="text-[#00ff41] fill-[#00ff41]" />
          </div>
        )}
      </div>
      <p
        className="text-sm font-bold text-[#00ff41] truncate"
        style={{ textShadow: '0 0 6px rgba(0,255,65,0.5)' }}
      >
        {playlist.name}
      </p>
      <p className="text-[10px] text-[#00ff41]/50 tracking-widest uppercase mt-0.5">
        {playlist.trackCount} tracks
      </p>
      <div className="flex gap-1 mt-2">
        <button
          onClick={onPin}
          className="flex-1 h-7 rounded-md border border-[#00ff41]/40 text-[#00ff41] flex items-center justify-center hover:bg-[#00ff41]/10"
          aria-label={isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={12} className={isPinned ? 'fill-[#00ff41]' : ''} />
        </button>
        <button
          onClick={onDelete}
          className="flex-1 h-7 rounded-md border border-[#E91429]/40 text-[#E91429] flex items-center justify-center hover:bg-[#E91429]/10"
          aria-label="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// DISPATCHERS
// ============================================================================

export function HomeVariant({ style }: { style: HomeStyle }) {
  switch (style) {
    case 'classic':
      return <ClassicHome />;
    case 'playful':
      return <PlayfulHome />;
    case 'neon':
      return <NeonHome />;
    case 'spotify':
      return <SpotifyHome />;
    default:
      return <ClassicHome />;
  }
}

export function LibraryVariant({ style }: { style: LibraryStyle }) {
  switch (style) {
    case 'classic':
      return <ClassicLibrary />;
    case 'playful':
      return <PlayfulLibrary />;
    case 'neon':
      return <NeonLibrary />;
    default:
      return <ClassicLibrary />;
  }
}

// Re-export the type union for consumers that want to switch styles dynamically.
export type { HomeStyle, LibraryStyle };
