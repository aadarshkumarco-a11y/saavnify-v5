'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Bell,
  Settings,
  ChevronRight,
  Heart,
  Clock,
  Sparkles,
  TrendingUp,
  Music2,
  RefreshCw,
  ArrowDown,
  Wifi,
  WifiOff,
  Flame,
  Dumbbell,
  Moon,
  Prayer,
  Radio,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';
import { useUserStore } from '@/stores/user-store';
import {
  getAggregatedTrending,
  getBollywoodHits,
  getPunjabiHits,
  getHindiRomantic,
  getLoFiIndia,
  getWorkoutIndia,
  getDevotional,
  getNewReleasesIndia,
  getTopIndianArtists,
  searchByMood,
  getNewReleases,
} from '@/lib/music-aggregator';
import { BrowseAllSection } from '@/components/tabs/browse-all-section';
import type { Track, Artist } from '@/types';

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
  { id: 'tamil', label: 'Tamil', emoji: '🎵' },
  { id: 'telugu', label: 'Telugu', emoji: '🎶' },
  { id: 'haryanvi', label: 'Haryanvi', emoji: '🎤' },
  { id: 'bhojpuri', label: 'Bhojpuri', emoji: '🥁' },
];

const QUICK_PLAY_ITEMS = [
  { id: 'liked', title: 'Liked Songs', icon: Heart, color: '#7C3AED' },
  { id: 'daily', title: 'Daily Mix', icon: Sparkles, color: '#1DB954' },
  { id: 'recent', title: 'Recently Played', icon: Clock, color: '#E11D48' },
];

// ---- Animation Variants ----

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

// ---- Helpers ----

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

// ---- Source Badge ----

function SourceBadge({ source }: { source?: string }) {
  if (!source || source === 'piped') return null;
  const colors: Record<string, string> = {
    youtube: 'bg-red-600',
    jiosaavn: 'bg-green-600',
    jamendo: 'bg-blue-500',
    audius: 'bg-purple-500',
    archive: 'bg-amber-600',
    cache: 'bg-gray-600',
  };
  return (
    <span className={`text-[8px] text-white px-1 py-0.5 rounded-full ${colors[source] || 'bg-gray-600'}`}>
      {source}
    </span>
  );
}

// ---- Image Fallback Component ----

function TrackImage({
  src,
  alt,
  className,
  fillMode = false,
}: {
  src: string;
  alt: string;
  className?: string;
  fillMode?: boolean;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`${className} bg-[#282828] flex items-center justify-center`}>
        <Music2 size={fillMode ? 32 : 16} className="text-[#1DB954]" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${fillMode ? 'absolute inset-0 w-full h-full' : ''}`}
      onError={() => setError(true)}
      loading="lazy"
      decoding="async"
    />
  );
}

// ---- Skeleton Loaders ----

function QuickPlaySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 bg-[#181818] rounded-2xl overflow-hidden h-14">
          <Skeleton className="w-14 h-14 flex-shrink-0 rounded-none" />
          <div className="flex-1 pr-3 space-y-1.5">
            <Skeleton className="h-3 w-3/4 rounded-full" />
            <Skeleton className="h-2.5 w-1/2 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HorizontalScrollSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-40">
          <Skeleton className="w-40 h-40 rounded-2xl" />
          <Skeleton className="h-3.5 w-32 mt-2.5 rounded-full" />
          <Skeleton className="h-2.5 w-20 mt-1.5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function MoodSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
      ))}
    </div>
  );
}

function ArtistSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-2.5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ---- Intersection Observer Hook ----

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ---- Lazy Section Component ----

function LazySection({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView(0.05);
  return (
    <div ref={ref} className={className}>
      {inView ? children : <div className="h-48" />}
    </div>
  );
}

// ---- Artist Avatar Component ----

function ArtistAvatar({ artist }: { artist: Artist }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex-shrink-0 flex flex-col items-center gap-2 w-20"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg">
        {artist.thumbnail ? (
          <img
            src={artist.thumbnail}
            alt={artist.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-[#282828] flex items-center justify-center">
            <Music2 size={24} className="text-[#727272]" />
          </div>
        )}
      </div>
      <p className="text-[11px] font-medium text-white text-center truncate w-full">
        {truncate(artist.name, 12)}
      </p>
    </motion.button>
  );
}

// ---- Horizontal Track Scroll Section ----

function TrackScrollSection({
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
  if (loading) return <HorizontalScrollSkeleton />;
  if (tracks.length === 0) return null;

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible">
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
        <button className="text-xs text-[#B3B3B3] hover:text-white transition-colors flex items-center gap-0.5">
          See all <ChevronRight size={14} />
        </button>
      </div>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory">
        {tracks.slice(0, 10).map((track, index) => (
          <motion.button
            key={track.id}
            variants={staggerItem}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPlayTrack(track, index)}
            className="flex-shrink-0 w-36 text-left group snap-start"
          >
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
              <TrackImage src={track.thumbnail} alt={track.title} fillMode className="object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 flex items-end justify-end p-2">
                <div className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <Play size={16} fill="white" className="text-white ml-0.5" />
                </div>
              </div>
              <SourceBadge source={track.source} />
            </div>
            <p className="text-sm font-medium text-white truncate mt-2">{truncate(track.title, 24)}</p>
            <p className="text-xs text-[#B3B3B3] truncate">{truncate(track.artist, 20)}</p>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ---- Default Indian Artists (fallback) ----

const DEFAULT_ARTISTS: Artist[] = [
  { id: 'def-1', channelId: 'arijit-singh', name: 'Arijit Singh', thumbnail: '' },
  { id: 'def-2', channelId: 'pritam', name: 'Pritam', thumbnail: '' },
  { id: 'def-3', channelId: 'ap-dhillon', name: 'AP Dhillon', thumbnail: '' },
  { id: 'def-4', channelId: 'shreya-ghoshal', name: 'Shreya Ghoshal', thumbnail: '' },
  { id: 'def-5', channelId: 'vishal-shekhar', name: 'Vishal-Shekhar', thumbnail: '' },
  { id: 'def-6', channelId: 'sonu-nigam', name: 'Sonu Nigam', thumbnail: '' },
  { id: 'def-7', channelId: 'neha-kakkar', name: 'Neha Kakkar', thumbnail: '' },
  { id: 'def-8', channelId: 'badshah', name: 'Badshah', thumbnail: '' },
  { id: 'def-9', channelId: 'guru-randhawa', name: 'Guru Randhawa', thumbnail: '' },
  { id: 'def-10', channelId: 'atif-aslam', name: 'Atif Aslam', thumbnail: '' },
];

// ---- Main Component ----

export function HomeTab() {
  // State for Indian music sections
  const [trending, setTrending] = useState<Track[]>([]);
  const [bollywoodHits, setBollywoodHits] = useState<Track[]>([]);
  const [punjabiHits, setPunjabiHits] = useState<Track[]>([]);
  const [hindiRomantic, setHindiRomantic] = useState<Track[]>([]);
  const [lofiIndia, setLofiIndia] = useState<Track[]>([]);
  const [workoutIndia, setWorkoutIndia] = useState<Track[]>([]);
  const [devotional, setDevotional] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [moodTracks, setMoodTracks] = useState<Record<string, Track[]>>({});
  const [continueListening, setContinueListening] = useState<Track[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);

  const [trendingLoading, setTrendingLoading] = useState(true);
  const [bollywoodLoading, setBollywoodLoading] = useState(true);
  const [punjabiLoading, setPunjabiLoading] = useState(true);
  const [newReleasesLoading, setNewReleasesLoading] = useState(true);

  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartYRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Stores
  const { play, playQueue } = usePlayerStore();
  const { likedSongs, history, addToHistory } = useLibraryStore();
  const { favoriteArtists } = useUserStore();

  // ---- Online/Offline Detection ----

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ---- Data Fetching (JioSaavn PRIMARY) ----

  const loadTrending = useCallback(async () => {
    try {
      setTrendingLoading(true);
      setTrendingError(null);
      const tracks = await getAggregatedTrending(20);
      setTrending(tracks);
      if (tracks.length === 0) {
        setTrendingError('No content available. Check your connection.');
      }
    } catch (err) {
      console.error('Failed to load trending:', err);
      setTrendingError('Failed to load trending music');
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  const loadBollywood = useCallback(async () => {
    try {
      setBollywoodLoading(true);
      const tracks = await getBollywoodHits(20);
      setBollywoodHits(tracks);
    } catch (err) {
      console.error('Failed to load Bollywood:', err);
    } finally {
      setBollywoodLoading(false);
    }
  }, []);

  const loadPunjabi = useCallback(async () => {
    try {
      setPunjabiLoading(true);
      const tracks = await getPunjabiHits(20);
      setPunjabiHits(tracks);
    } catch (err) {
      console.error('Failed to load Punjabi:', err);
    } finally {
      setPunjabiLoading(false);
    }
  }, []);

  const loadNewReleases = useCallback(async () => {
    try {
      setNewReleasesLoading(true);
      const tracks = await getNewReleasesIndia(20);
      setNewReleases(tracks);
    } catch (err) {
      console.error('Failed to load new releases:', err);
    } finally {
      setNewReleasesLoading(false);
    }
  }, []);

  // Lazy-loaded sections (only load when visible)
  const loadHindiRomantic = useCallback(async () => {
    if (hindiRomantic.length > 0) return;
    try {
      const tracks = await getHindiRomantic(20);
      setHindiRomantic(tracks);
    } catch (err) {
      console.error('Failed to load Hindi Romantic:', err);
    }
  }, [hindiRomantic.length]);

  const loadLofiIndia = useCallback(async () => {
    if (lofiIndia.length > 0) return;
    try {
      const tracks = await getLoFiIndia(20);
      setLofiIndia(tracks);
    } catch (err) {
      console.error('Failed to load Lo-Fi India:', err);
    }
  }, [lofiIndia.length]);

  const loadWorkoutIndia = useCallback(async () => {
    if (workoutIndia.length > 0) return;
    try {
      const tracks = await getWorkoutIndia(20);
      setWorkoutIndia(tracks);
    } catch (err) {
      console.error('Failed to load Workout India:', err);
    }
  }, [workoutIndia.length]);

  const loadDevotional = useCallback(async () => {
    if (devotional.length > 0) return;
    try {
      const tracks = await getDevotional(20);
      setDevotional(tracks);
    } catch (err) {
      console.error('Failed to load Devotional:', err);
    }
  }, [devotional.length]);

  const loadTopArtists = useCallback(async () => {
    if (topArtists.length > 0) return;
    try {
      const artists = await getTopIndianArtists();
      setTopArtists(artists);
    } catch (err) {
      console.error('Failed to load top artists:', err);
    }
  }, [topArtists.length]);

  const loadMoodTracks = useCallback(async (moodId: string) => {
    try {
      const tracks = await searchByMood(moodId);
      setMoodTracks((prev) => ({ ...prev, [moodId]: tracks }));
    } catch (err) {
      console.error(`Failed to load mood ${moodId}:`, err);
    }
  }, []);

  // ---- Effects ----

  useEffect(() => {
    // Load primary sections immediately
    loadTrending();
    loadBollywood();
    loadPunjabi();
    loadNewReleases();

    // Load continue listening from history
    const { history } = useLibraryStore.getState();
    const recentTracks = history.slice(0, 10).map((h) => h.track);
    setContinueListening(recentTracks);
  }, [loadTrending, loadBollywood, loadPunjabi, loadNewReleases]);

  // ---- Handlers ----

  const handlePlayTrack = (track: Track, index: number, trackList?: Track[]) => {
    const list = trackList || [track];
    playQueue(list, index, 'home');
    addToHistory(track);
  };

  const handlePlaySingle = (track: Track) => {
    play(track, 'home');
    addToHistory(track);
  };

  const handleMoodClick = (moodId: string) => {
    if (!moodTracks[moodId]) {
      loadMoodTracks(moodId);
    }
  };

  // ---- Pull-to-Refresh Handlers ----

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadTrending(),
        loadBollywood(),
        loadPunjabi(),
        loadNewReleases(),
      ]);
    } catch {
      // Silently handle refresh errors
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [loadTrending, loadBollywood, loadPunjabi, loadNewReleases]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop <= 0) {
      touchStartYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const diff = e.touches[0].clientY - touchStartYRef.current;
    if (diff > 0) {
      const damped = Math.min(diff * 0.4, 100);
      setPullDistance(damped);
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60 && !isRefreshing) {
      refreshAll();
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [pullDistance, isRefreshing, refreshAll]);

  // ---- Quick Play Data ----

  const quickPlayCards = [
    ...QUICK_PLAY_ITEMS.map((item) => {
      let subtitle = '';
      let thumbnail = '';
      let tracks: Track[] = [];

      if (item.id === 'liked') {
        subtitle = `${likedSongs.length} songs`;
        tracks = likedSongs;
      } else if (item.id === 'recent') {
        const recentTracks = history.slice(0, 20).map((h) => h.track);
        subtitle = `${recentTracks.length} songs`;
        tracks = recentTracks;
        thumbnail = recentTracks[0]?.thumbnail || '';
      } else if (item.id === 'daily') {
        subtitle = 'Made for you';
        tracks = trending.slice(0, 20);
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

  // ---- Greeting ----

  const greeting = getGreeting();

  // ---- Render ----

  return (
    <div
      ref={scrollContainerRef}
      className="px-4 pt-[env(safe-area-inset-top)] pb-28 bg-[#090909]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-Refresh Indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-2 mb-2"
            style={{ height: isRefreshing ? 40 : pullDistance * 0.5 }}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: pullDistance > 60 ? 180 : 0 }}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}
            >
              {isRefreshing ? (
                <RefreshCw size={20} className="text-[#1DB954]" />
              ) : (
                <ArrowDown size={20} className={`transition-colors ${pullDistance > 60 ? 'text-[#1DB954]' : 'text-[#727272]'}`} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HEADER BAR ===== */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between py-4 sticky top-0 z-10 bg-[#090909]/90 backdrop-blur-lg"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-[#1DB954]">
            SAAVNIFY
          </h1>
          {isOffline && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20">
              <WifiOff size={12} className="text-amber-400" />
              <span className="text-[10px] text-amber-400">Offline</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-white/70 mr-3 hidden sm:block">
            {greeting}
          </p>
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-full hover:bg-[#181818] transition-colors" aria-label="Notifications">
            <Bell size={20} className="text-[#B3B3B3]" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-full hover:bg-[#181818] transition-colors" aria-label="Settings">
            <Settings size={20} className="text-[#B3B3B3]" />
          </motion.button>
        </div>
      </motion.header>

      {/* ===== GREETING (Mobile) ===== */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mb-5 sm:hidden">
        <h2 className="text-2xl font-bold text-white">{greeting}</h2>
        <p className="text-sm text-[#B3B3B3] mt-0.5">Discover your next favorite song</p>
      </motion.div>

      {/* ===== QUICK PLAY SECTION ===== */}
      <LazySection className="mb-7">
        <motion.div variants={sectionVariants} initial="hidden" animate="visible">
          {trendingLoading ? (
            <QuickPlaySkeleton />
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-2">
              {quickPlayCards.slice(0, 6).map((card) => {
                const IconComponent = card.icon;
                return (
                  <motion.button
                    key={card.id}
                    variants={staggerItem}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (card.tracks.length > 0) {
                        playQueue(card.tracks, 0, 'home-quick');
                        if (card.tracks[0]) addToHistory(card.tracks[0]);
                      }
                    }}
                    className="flex items-center gap-2 bg-[#181818] hover:bg-[#222] rounded-2xl overflow-hidden transition-colors group h-14"
                  >
                    {card.thumbnail ? (
                      <div className="w-14 h-14 flex-shrink-0 relative overflow-hidden">
                        <TrackImage src={card.thumbnail} alt={card.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: card.color }}>
                        <IconComponent size={18} className="text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-semibold text-white truncate">{card.title}</p>
                      <p className="text-[10px] text-[#B3B3B3] truncate">{card.subtitle}</p>
                    </div>
                    <div className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Play size={14} fill="#1DB954" className="text-[#1DB954]" />
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </LazySection>

      {/* ===== TRENDING INDIA ===== */}
      <LazySection className="mb-7">
        <TrackScrollSection
          title="Trending India"
          icon={<TrendingUp size={20} className="text-[#1DB954]" />}
          tracks={trending}
          loading={trendingLoading}
          onPlayTrack={(track, index) => handlePlayTrack(track, index, trending)}
          badge="Live"
        />
        {trendingError && !trendingLoading && (
          <div className="text-center py-4 bg-[#181818] rounded-2xl mt-2">
            <p className="text-[#B3B3B3] text-sm">{trendingError}</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={loadTrending}
              className="mt-2 px-4 py-2 bg-[#1DB954] text-white text-sm rounded-full inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Retry
            </motion.button>
          </div>
        )}
      </LazySection>

      {/* ===== BOLLYWOOD HITS ===== */}
      <LazySection className="mb-7">
        <TrackScrollSection
          title="Bollywood Hits"
          icon={<Flame size={20} className="text-[#FF6B35]" />}
          tracks={bollywoodHits}
          loading={bollywoodLoading}
          onPlayTrack={(track, index) => handlePlayTrack(track, index, bollywoodHits)}
        />
      </LazySection>

      {/* ===== PUNJABI HITS ===== */}
      <LazySection className="mb-7">
        <TrackScrollSection
          title="Punjabi Hits"
          icon={<Music2 size={20} className="text-[#FFB800]" />}
          tracks={punjabiHits}
          loading={punjabiLoading}
          onPlayTrack={(track, index) => handlePlayTrack(track, index, punjabiHits)}
        />
      </LazySection>

      {/* ===== GENRE / MOOD BROWSER ===== */}
      <LazySection className="mb-7">
        <motion.div variants={sectionVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Browse by Mood</h2>
          </div>
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {MOODS.map((mood) => (
              <motion.button
                key={mood.id}
                variants={staggerItem}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleMoodClick(mood.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] hover:bg-[#282828] transition-colors border border-[#282828]/50"
              >
                <span className="text-sm">{mood.emoji}</span>
                <span className="text-xs font-medium text-white whitespace-nowrap">{mood.label}</span>
              </motion.button>
            ))}
          </motion.div>
          {Object.entries(moodTracks).map(([moodId, tracks]) => {
            if (tracks.length === 0) return null;
            const mood = MOODS.find((m) => m.id === moodId);
            return (
              <motion.div key={moodId} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                <p className="text-sm font-medium text-[#B3B3B3] mb-2">{mood?.emoji} {mood?.label} Picks</p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
                  {tracks.slice(0, 8).map((track, index) => (
                    <motion.button key={track.id} whileTap={{ scale: 0.97 }} onClick={() => handlePlayTrack(track, index, tracks)} className="flex-shrink-0 w-32 text-left group">
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden">
                        <TrackImage src={track.thumbnail} alt={track.title} fillMode className="object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={14} fill="white" className="text-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-white truncate mt-1.5">{truncate(track.title, 22)}</p>
                      <p className="text-[10px] text-[#B3B3B3] truncate">{truncate(track.artist, 18)}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </LazySection>

      {/* ===== HINDI ROMANTIC ===== */}
      <LazySection className="mb-7">
        <TrackScrollSection
          title="Hindi Romantic"
          icon={<Heart size={20} className="text-[#FF4081]" />}
          tracks={hindiRomantic}
          loading={false}
          onPlayTrack={(track, index) => handlePlayTrack(track, index, hindiRomantic)}
        />
        {hindiRomantic.length === 0 && (
          <div className="flex justify-center">
            <button
              onClick={loadHindiRomantic}
              className="text-xs text-[#1DB954] hover:text-[#1ed760] transition-colors"
            >
              Load Hindi Romantic
            </button>
          </div>
        )}
      </LazySection>

      {/* ===== LO-FI INDIA ===== */}
      <LazySection className="mb-7">
        <TrackScrollSection
          title="Lo-Fi India"
          icon={<Moon size={20} className="text-[#7C4DFF]" />}
          tracks={lofiIndia}
          loading={false}
          onPlayTrack={(track, index) => handlePlayTrack(track, index, lofiIndia)}
        />
        {lofiIndia.length === 0 && (
          <div className="flex justify-center">
            <button
              onClick={loadLofiIndia}
              className="text-xs text-[#1DB954] hover:text-[#1ed760] transition-colors"
            >
              Load Lo-Fi India
            </button>
          </div>
        )}
      </LazySection>

      {/* ===== WORKOUT INDIA ===== */}
      <LazySection className="mb-7">
        <TrackScrollSection
          title="Workout India"
          icon={<Dumbbell size={20} className="text-[#FF5252]" />}
          tracks={workoutIndia}
          loading={false}
          onPlayTrack={(track, index) => handlePlayTrack(track, index, workoutIndia)}
        />
        {workoutIndia.length === 0 && (
          <div className="flex justify-center">
            <button
              onClick={loadWorkoutIndia}
              className="text-xs text-[#1DB954] hover:text-[#1ed760] transition-colors"
            >
              Load Workout India
            </button>
          </div>
        )}
      </LazySection>

      {/* ===== DEVOTIONAL ===== */}
      <LazySection className="mb-7">
        <TrackScrollSection
          title="Devotional"
          icon={<Sparkles size={20} className="text-[#FFB300]" />}
          tracks={devotional}
          loading={false}
          onPlayTrack={(track, index) => handlePlayTrack(track, index, devotional)}
        />
        {devotional.length === 0 && (
          <div className="flex justify-center">
            <button
              onClick={loadDevotional}
              className="text-xs text-[#1DB954] hover:text-[#1ed760] transition-colors"
            >
              Load Devotional
            </button>
          </div>
        )}
      </LazySection>

      {/* ===== CONTINUE LISTENING ===== */}
      <LazySection className="mb-7">
        <motion.div variants={sectionVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#1DB954]" />
              <h2 className="text-lg font-bold text-white">Continue Listening</h2>
            </div>
          </div>
          {continueListening.length > 0 ? (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
              {continueListening.map((track, index) => (
                <motion.button key={`${track.id}-${index}`} variants={staggerItem} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handlePlaySingle(track)} className="flex-shrink-0 w-44 text-left group">
                  <div className="flex items-center gap-3 bg-[#181818] hover:bg-[#222] rounded-2xl p-2 pr-3 transition-colors">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <TrackImage src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{truncate(track.title, 20)}</p>
                      <p className="text-[10px] text-[#B3B3B3] truncate">{truncate(track.artist, 16)}</p>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-[#1DB954] flex-shrink-0" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <div className="bg-[#181818] rounded-2xl p-6 text-center">
              <Music2 size={36} className="text-[#282828] mx-auto mb-2" />
              <p className="text-[#B3B3B3] text-sm">Your recently played songs will appear here</p>
              <p className="text-[#727272] text-xs mt-1">Start listening to build your history</p>
            </div>
          )}
        </motion.div>
      </LazySection>

      {/* ===== TOP ARTISTS INDIA ===== */}
      <LazySection className="mb-7">
        <motion.div variants={sectionVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Top Artists India</h2>
          </div>
          {topArtists.length > 0 ? (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth">
              {topArtists.map((artist) => <ArtistAvatar key={artist.channelId} artist={artist} />)}
            </motion.div>
          ) : favoriteArtists.length > 0 ? (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth">
              {favoriteArtists.map((artist) => <ArtistAvatar key={artist.channelId} artist={artist} />)}
            </motion.div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth">
              {DEFAULT_ARTISTS.map((artist) => <ArtistAvatar key={artist.channelId} artist={artist} />)}
              <button
                onClick={loadTopArtists}
                className="flex-shrink-0 flex flex-col items-center gap-2 w-20"
              >
                <div className="w-20 h-20 rounded-full bg-[#181818] flex items-center justify-center">
                  <RefreshCw size={16} className="text-[#1DB954]" />
                </div>
                <p className="text-[10px] text-[#1DB954]">Load Artists</p>
              </button>
            </motion.div>
          )}
        </motion.div>
      </LazySection>

      {/* ===== BROWSE ALL (expanded library) ===== */}
      <LazySection className="mb-7">
        <BrowseAllSection />
      </LazySection>

      {/* ===== NEW RELEASES INDIA ===== */}
      <LazySection className="mb-7">
        <TrackScrollSection
          title="New Releases India"
          icon={<Sparkles size={20} className="text-[#1DB954]" />}
          tracks={newReleases}
          loading={newReleasesLoading}
          onPlayTrack={(track, index) => handlePlayTrack(track, index, newReleases)}
        />
      </LazySection>
    </div>
  );
}
