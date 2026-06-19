"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Shuffle,
  ChevronLeft,
  Music,
  UserPlus,
  UserCheck,
  Disc3,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePlayerStore } from '@/stores/player-store';
import { useUserStore } from '@/stores/user-store';
import { getInnertubeArtist } from '@/lib/sources/innertube-api';
import type { Track, Album, Artist } from '@/types';

// ---- Helpers ----

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---- Image with Fallback ----

function SmartImage({
  src,
  alt,
  className,
  fallbackIcon: Fallback = Music,
  fallbackSize = 24,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ComponentType<{ size?: number; className?: string }>;
  fallbackSize?: number;
}) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`${className || ''} bg-[#282828] flex items-center justify-center`}>
        <Fallback size={fallbackSize} className="text-[#1DB954]/60" />
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

// ---- Skeletons ----

function ArtistHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="w-full h-44 sm:h-56 rounded-3xl" />
      <div className="flex items-end gap-4 -mt-12 px-4 sm:px-6">
        <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#090909]" />
        <div className="flex-1 space-y-2 pb-2">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex gap-2 mt-4 px-4 sm:px-6">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
    </div>
  );
}

function TrackListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3 rounded-full" />
            <Skeleton className="h-2.5 w-1/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

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

// ---- Main Component ----

interface ArtistScreenProps {
  channelId: string;
  onBack: () => void;
}

export function ArtistScreen({ channelId, onBack }: ArtistScreenProps) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const playQueue = usePlayerStore((s) => s.playQueue);
  const addFavoriteArtist = useUserStore((s) => s.addFavoriteArtist);
  const removeFavoriteArtist = useUserStore((s) => s.removeFavoriteArtist);
  const favoriteArtists = useUserStore((s) => s.favoriteArtists);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInnertubeArtist(channelId);
      setArtist(result.artist);
      setTopTracks(result.topTracks);
      setAlbums(result.albums);
    } catch (err) {
      console.error('Artist load failed:', err);
      setError('Could not load artist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    load();
  }, [load]);

  // Sync follow state from favoriteArtists
  useEffect(() => {
    if (!artist) return;
    setIsFollowing(favoriteArtists.some((a) => a.channelId === artist.channelId));
  }, [favoriteArtists, artist]);

  const handlePlayAll = () => {
    if (topTracks.length > 0) playQueue(topTracks, 0, `artist:${channelId}`);
  };

  const handleShuffle = () => {
    if (topTracks.length > 0) {
      const shuffled = shuffleArray(topTracks);
      playQueue(shuffled, 0, `artist:${channelId}:shuffle`);
    }
  };

  const handleToggleFollow = () => {
    if (!artist) return;
    if (isFollowing) {
      removeFavoriteArtist(artist.channelId);
    } else {
      addFavoriteArtist(artist);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      {/* Back button */}
      <div className="sticky top-0 z-10 bg-[#090909]/80 backdrop-blur-md px-2 sm:px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Go back"
          className="rounded-full hover:bg-[#1DB954]/10 hover:text-[#1DB954]"
        >
          <ChevronLeft size={22} />
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-32 -mt-2">
        {loading ? (
          <>
            <ArtistHeaderSkeleton />
            <div className="mt-8">
              <Skeleton className="h-5 w-32 mb-3 rounded-full" />
              <TrackListSkeleton />
            </div>
            <div className="mt-8">
              <Skeleton className="h-5 w-32 mb-3 rounded-full" />
              <AlbumScrollSkeleton />
            </div>
          </>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 text-sm">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="ml-3 bg-transparent border-red-500/40 text-red-300 hover:bg-red-500/10"
            >
              Retry
            </Button>
          </div>
        ) : !artist ? (
          <div className="text-center py-16 text-[#B3B3B3]">Artist not found.</div>
        ) : (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Banner */}
              <div className="relative w-full h-44 sm:h-56 rounded-3xl overflow-hidden bg-[#181818]">
                {artist.thumbnail ? (
                  <>
                    <img
                      src={artist.thumbnail}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-[#090909]/40 to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1DB954]/30 to-[#181818]" />
                )}
              </div>

              {/* Avatar + Name */}
              <div className="flex items-end gap-4 -mt-14 sm:-mt-16 px-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-[#090909] shadow-xl flex-shrink-0 bg-[#181818]">
                  <SmartImage
                    src={artist.thumbnail}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                    fallbackIcon={Music}
                    fallbackSize={32}
                  />
                </div>
                <div className="flex-1 pb-2 min-w-0">
                  <Badge className="mb-1.5 bg-[#1DB954]/10 text-[#1DB954] border-0">
                    Artist
                  </Badge>
                  <h1 className="text-2xl sm:text-4xl font-bold tracking-tight truncate">
                    {artist.name}
                  </h1>
                  {artist.subscriberCount && (
                    <p className="text-xs text-[#B3B3B3] mt-1">
                      {artist.subscriberCount}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-5 px-2">
                <Button
                  onClick={handlePlayAll}
                  disabled={topTracks.length === 0}
                  className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-full"
                >
                  <Play size={16} fill="currentColor" className="mr-1.5" /> Play
                </Button>
                <Button
                  onClick={handleShuffle}
                  disabled={topTracks.length === 0}
                  variant="outline"
                  className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
                >
                  <Shuffle size={16} className="mr-1.5" /> Shuffle
                </Button>
                <Button
                  onClick={handleToggleFollow}
                  variant="outline"
                  className={`rounded-full border-[#282828] hover:bg-[#222222] ${
                    isFollowing
                      ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/40 hover:bg-[#1DB954]/20 hover:text-[#1DB954]'
                      : 'bg-transparent text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={16} className="mr-1.5" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="mr-1.5" /> Follow
                    </>
                  )}
                </Button>
              </div>

              {artist.description && (
                <p className="text-sm text-[#B3B3B3] mt-4 px-2 leading-relaxed">
                  {artist.description}
                </p>
              )}
            </motion.div>

            {/* Top Songs */}
            {topTracks.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-10"
                aria-label="Top Songs"
              >
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Heart size={18} className="text-[#1DB954]" />
                  <h2 className="text-lg font-bold">Top Songs</h2>
                </div>
                <div className="bg-[#181818] rounded-2xl overflow-hidden">
                  {topTracks.slice(0, 10).map((track, index) => (
                    <button
                      key={`${track.id}-${index}`}
                      onClick={() => playQueue(topTracks, index, `artist:${channelId}`)}
                      className="flex items-center gap-3 p-2.5 hover:bg-[#222222] w-full text-left transition-colors group border-b border-[#222222] last:border-0"
                    >
                      <div className="w-7 text-center text-sm text-[#B3B3B3] group-hover:hidden">
                        {index + 1}
                      </div>
                      <div className="w-7 flex items-center justify-center hidden group-hover:flex">
                        <Play size={14} fill="#1DB954" className="text-[#1DB954]" />
                      </div>
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <SmartImage
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
              </motion.section>
            )}

            {/* Albums */}
            {albums.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="mt-10"
                aria-label="Albums"
              >
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Disc3 size={18} className="text-[#1DB954]" />
                  <h2 className="text-lg font-bold">Albums</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-2">
                  {albums.map((album) => (
                    <div
                      key={album.id || album.playlistId}
                      className="flex-shrink-0 w-40 group cursor-pointer"
                    >
                      <div className="relative w-40 h-40 rounded-2xl overflow-hidden shadow-lg bg-[#181818]">
                        <SmartImage
                          src={album.thumbnail}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          fallbackIcon={Disc3}
                          fallbackSize={28}
                        />
                      </div>
                      <p className="text-sm font-medium text-white truncate mt-2">
                        {truncate(album.title, 22)}
                      </p>
                      <p className="text-xs text-[#B3B3B3] truncate">
                        {truncate(album.artist, 20) || artist.name}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {topTracks.length === 0 && albums.length === 0 && !loading && (
              <div className="bg-[#181818] rounded-2xl py-16 text-center mt-6">
                <Music size={40} className="mx-auto text-[#1DB954]/40 mb-3" />
                <p className="text-sm text-[#B3B3B3]">
                  No content available for this artist.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
