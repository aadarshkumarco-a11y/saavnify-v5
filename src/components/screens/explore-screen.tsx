"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Sparkles,
  Flame,
  TrendingUp,
  Search as SearchIcon,
  RefreshCw,
  Music,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePlayerStore } from '@/stores/player-store';
import {
  getInnertubeExplore,
  searchInnertube,
} from '@/lib/sources/innertube-api';
import type { Track, Album } from '@/types';

// ---- Helpers ----

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ---- Track Image with Fallback ----

function TrackImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`${className || ''} bg-[#282828] flex items-center justify-center`}>
        <Music size={20} className="text-[#1DB954]/60" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      decoding="async"
    />
  );
}

// ---- Mood Pills ----

const MOODS = [
  { label: 'Pop', color: 'from-pink-500 to-rose-600' },
  { label: 'Hip-Hop', color: 'from-amber-500 to-orange-600' },
  { label: 'Romantic', color: 'from-rose-500 to-pink-600' },
  { label: 'Workout', color: 'from-emerald-500 to-green-600' },
  { label: 'Chill', color: 'from-sky-500 to-cyan-600' },
  { label: 'Party', color: 'from-fuchsia-500 to-purple-600' },
  { label: 'Rock', color: 'from-red-500 to-rose-700' },
  { label: 'Devotional', color: 'from-yellow-500 to-amber-600' },
  { label: 'Lo-Fi', color: 'from-indigo-500 to-violet-600' },
  { label: 'Bollywood', color: 'from-rose-400 to-red-600' },
  { label: 'Latin', color: 'from-orange-400 to-amber-600' },
  { label: 'Jazz', color: 'from-teal-500 to-emerald-700' },
];

// ---- Skeletons ----

function AlbumScrollSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-40">
          <Skeleton className="w-40 h-40 rounded-2xl" />
          <Skeleton className="h-3.5 w-32 mt-2.5 rounded-full" />
          <Skeleton className="h-2.5 w-20 mt-1.5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function TrackListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3 rounded-full" />
            <Skeleton className="h-2.5 w-1/3 rounded-full" />
          </div>
          <Skeleton className="h-3 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ---- Section Header ----

function SectionHeader({
  icon,
  title,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[#1DB954]">{icon}</span>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {badge && (
          <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0 hover:bg-[#1DB954]/20">
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ---- Main Component ----

export function ExploreScreen() {
  const [newReleases, setNewReleases] = useState<Album[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [charts, setCharts] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);

  const playQueue = usePlayerStore((s) => s.playQueue);

  const loadExplore = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await getInnertubeExplore();
      if (
        result.newReleases.length === 0 &&
        result.topTracks.length === 0
      ) {
        // Fallback to search
        const fallback = await searchInnertube('top music', 25);
        setNewReleases([]);
        setTopTracks(fallback.tracks.slice(0, 12));
        setCharts(fallback.tracks.slice(0, 10));
      } else {
        setNewReleases(result.newReleases.slice(0, 12));
        setTopTracks(result.topTracks.slice(0, 12));
        setCharts(result.topTracks.slice(0, 10));
      }
    } catch (err) {
      console.error('Explore load failed:', err);
      setError('Could not load explore content. Please try again.');
      try {
        const fallback = await searchInnertube('top music', 20);
        if (fallback.tracks.length > 0) {
          setTopTracks(fallback.tracks.slice(0, 12));
          setCharts(fallback.tracks.slice(0, 10));
          setError(null);
        }
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadExplore();
  }, [loadExplore]);

  const handleMoodSearch = async (mood: string) => {
    setActiveMood(mood);
    try {
      const result = await searchInnertube(`${mood} music`, 20);
      if (result.tracks.length > 0) {
        setCharts(result.tracks);
      }
    } catch {}
  };

  const handlePlayTrack = (track: Track, index: number) => {
    playQueue(topTracks, index, 'explore');
  };

  const handlePlayChart = (track: Track, index: number) => {
    playQueue(charts, index, 'explore-charts');
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Explore
              </h1>
              <p className="text-xs text-[#B3B3B3]">
                Discover new music & charts
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadExplore(true)}
            disabled={refreshing}
            aria-label="Refresh explore"
            className="rounded-full hover:bg-[#1DB954]/10 hover:text-[#1DB954]"
          >
            <RefreshCw
              size={18}
              className={refreshing ? 'animate-spin' : ''}
            />
          </Button>
        </motion.div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-6">
            {error}
          </div>
        )}

        {/* New Releases Section */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-8"
          aria-label="New Releases"
        >
          <SectionHeader
            icon={<TrendingUp size={20} />}
            title="New Releases"
            badge="Fresh"
          />
          {loading ? (
            <AlbumScrollSkeleton />
          ) : newReleases.length === 0 ? (
            <div className="text-sm text-[#B3B3B3] py-8 text-center bg-[#181818] rounded-2xl">
              No new releases found.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {newReleases.map((album) => (
                <div
                  key={album.id}
                  className="flex-shrink-0 w-40 group cursor-pointer"
                >
                  <div className="relative w-40 h-40 rounded-2xl overflow-hidden shadow-lg">
                    <TrackImage
                      src={album.thumbnail}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-sm font-medium text-white truncate mt-2">
                    {truncate(album.title, 22)}
                  </p>
                  <p className="text-xs text-[#B3B3B3] truncate">
                    {truncate(album.artist, 20)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Top Tracks Section */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
          aria-label="Top Tracks"
        >
          <SectionHeader
            icon={<Flame size={20} />}
            title="Top Tracks"
            badge="Trending"
          />
          {loading ? (
            <TrackListSkeleton count={6} />
          ) : topTracks.length === 0 ? (
            <div className="text-sm text-[#B3B3B3] py-8 text-center bg-[#181818] rounded-2xl">
              No top tracks available.
            </div>
          ) : (
            <div className="bg-[#181818] rounded-2xl overflow-hidden">
              {topTracks.slice(0, 8).map((track, index) => (
                <button
                  key={`${track.id}-${index}`}
                  onClick={() => handlePlayTrack(track, index)}
                  className="flex items-center gap-3 p-2.5 hover:bg-[#222222] w-full text-left transition-colors group border-b border-[#222222] last:border-0"
                >
                  <div className="w-7 text-center text-sm text-[#B3B3B3] group-hover:hidden">
                    {index + 1}
                  </div>
                  <div className="w-7 flex items-center justify-center hidden group-hover:flex">
                    <Play size={14} fill="#1DB954" className="text-[#1DB954]" />
                  </div>
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <TrackImage
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {truncate(track.title, 36)}
                    </p>
                    <p className="text-xs text-[#B3B3B3] truncate">
                      {truncate(track.artist, 28)}
                    </p>
                  </div>
                  <span className="text-xs text-[#B3B3B3] flex-shrink-0">
                    {formatDuration(track.duration)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.section>

        {/* Charts Section */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-8"
          aria-label="Charts"
        >
          <SectionHeader
            icon={<Radio size={20} />}
            title="Charts"
            badge="Top 10"
          />
          {loading ? (
            <TrackListSkeleton count={5} />
          ) : charts.length === 0 ? (
            <div className="text-sm text-[#B3B3B3] py-8 text-center bg-[#181818] rounded-2xl">
              No charts available.
            </div>
          ) : (
            <div className="bg-[#181818] rounded-2xl overflow-hidden">
              {charts.slice(0, 10).map((track, index) => (
                <button
                  key={`chart-${track.id}-${index}`}
                  onClick={() => handlePlayChart(track, index)}
                  className="flex items-center gap-3 p-2.5 hover:bg-[#222222] w-full text-left transition-colors group border-b border-[#222222] last:border-0"
                >
                  <div className="w-9 text-center text-base font-bold text-[#1DB954]">
                    {index + 1}
                  </div>
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <TrackImage
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {truncate(track.title, 36)}
                    </p>
                    <p className="text-xs text-[#B3B3B3] truncate">
                      {truncate(track.artist, 28)}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#1DB954]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={12} fill="#1DB954" className="text-[#1DB954]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.section>

        {/* Moods & Genres */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          aria-label="Moods & Genres"
        >
          <SectionHeader
            icon={<SearchIcon size={20} />}
            title="Moods & Genres"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {MOODS.map((mood) => (
              <button
                key={mood.label}
                onClick={() => handleMoodSearch(mood.label)}
                className={`relative h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${mood.color} p-3 text-left hover:scale-[1.02] transition-transform ${
                  activeMood === mood.label ? 'ring-2 ring-white ring-offset-2 ring-offset-[#090909]' : ''
                }`}
              >
                <span className="relative z-10 text-sm font-bold text-white drop-shadow">
                  {mood.label}
                </span>
                <div className="absolute -right-2 -bottom-2 w-12 h-12 rounded-full bg-white/15" />
              </button>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
