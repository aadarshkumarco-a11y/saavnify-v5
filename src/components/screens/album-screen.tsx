"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Shuffle,
  ChevronLeft,
  Disc3,
  Heart,
  Clock,
  Plus,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';
import { getInnertubeAlbum } from '@/lib/sources/innertube-api';
import type { Track, Album } from '@/types';

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
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`${className || ''} bg-[#282828] flex items-center justify-center`}>
        <Disc3 size={28} className="text-[#1DB954]/60" />
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

function AlbumHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-5">
      <Skeleton className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-3 pt-2">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-8 w-2/3 rounded-full" />
        <Skeleton className="h-4 w-1/2 rounded-full" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function TrackListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          <Skeleton className="w-4 h-3 rounded-full" />
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

// ---- Main Component ----

interface AlbumScreenProps {
  browseId: string;
  onBack: () => void;
}

export function AlbumScreen({ browseId, onBack }: AlbumScreenProps) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playQueue = usePlayerStore((s) => s.playQueue);
  const likedSongs = useLibraryStore((s) => s.likedSongs);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const playlists = useLibraryStore((s) => s.playlists);

  const [savedToLibrary, setSavedToLibrary] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInnertubeAlbum(browseId);
      setAlbum(result.album);
      setTracks(result.tracks);
    } catch (err) {
      console.error('Album load failed:', err);
      setError('Could not load album. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [browseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlayAll = () => {
    if (tracks.length > 0) playQueue(tracks, 0, `album:${browseId}`);
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = shuffleArray(tracks);
      playQueue(shuffled, 0, `album:${browseId}:shuffle`);
    }
  };

  const handlePlayTrack = (index: number) => {
    if (tracks.length > 0) playQueue(tracks, index, `album:${browseId}`);
  };

  const handleSaveToLibrary = () => {
    if (!album || tracks.length === 0) return;
    // Create or reuse a playlist named after the album
    let target = playlists.find(
      (p) => p.name.toLowerCase() === album.title.toLowerCase()
    );
    if (!target) {
      const { createPlaylist } = useLibraryStore.getState();
      target = createPlaylist(album.title, `Album by ${album.artist}`);
    }
    for (const t of tracks) {
      addTrackToPlaylist(target.id, t);
    }
    setSavedToLibrary(true);
  };

  const isLiked = (trackId: string) =>
    likedSongs.some((s) => s.id === trackId);

  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalMinutes = Math.round(totalDuration / 60);

  return (
    <div className="min-h-screen bg-[#090909] text-white">
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-32 -mt-2">
        {loading ? (
          <>
            <AlbumHeaderSkeleton />
            <div className="mt-8">
              <TrackListSkeleton count={8} />
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
        ) : !album ? (
          <div className="text-center py-16 text-[#B3B3B3]">Album not found.</div>
        ) : (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col sm:flex-row gap-5"
            >
              <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 bg-[#181818]">
                <SmartImage
                  src={album.thumbnail}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 flex flex-col justify-end min-w-0">
                <Badge className="self-start mb-2 bg-[#1DB954]/10 text-[#1DB954] border-0">
                  Album
                </Badge>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
                  {album.title}
                </h1>
                <p className="text-sm text-[#B3B3B3] mt-2">
                  by <span className="text-white font-medium">{album.artist || 'Unknown artist'}</span>
                </p>
                <p className="text-xs text-[#B3B3B3] mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Disc3 size={12} /> {tracks.length} tracks
                  </span>
                  {totalMinutes > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {totalMinutes} min
                    </span>
                  )}
                </p>

                <div className="flex flex-wrap gap-2 mt-5">
                  <Button
                    onClick={handlePlayAll}
                    disabled={tracks.length === 0}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-full"
                  >
                    <Play size={16} fill="currentColor" className="mr-1.5" /> Play All
                  </Button>
                  <Button
                    onClick={handleShuffle}
                    disabled={tracks.length === 0}
                    variant="outline"
                    className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
                  >
                    <Shuffle size={16} className="mr-1.5" /> Shuffle
                  </Button>
                  <Button
                    onClick={handleSaveToLibrary}
                    disabled={tracks.length === 0}
                    variant="outline"
                    className={`rounded-full border-[#282828] hover:bg-[#222222] ${
                      savedToLibrary
                        ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/40 hover:bg-[#1DB954]/20 hover:text-[#1DB954]'
                        : 'bg-transparent text-white'
                    }`}
                  >
                    {savedToLibrary ? (
                      <>
                        <Check size={16} className="mr-1.5" /> Saved
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-1.5" /> Save to Library
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Track List */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-8"
              aria-label="Tracks"
            >
              {tracks.length === 0 ? (
                <div className="bg-[#181818] rounded-2xl py-12 text-center">
                  <Disc3 size={36} className="mx-auto text-[#1DB954]/40 mb-3" />
                  <p className="text-sm text-[#B3B3B3]">
                    No tracks available for this album.
                  </p>
                </div>
              ) : (
                <div className="bg-[#181818] rounded-2xl overflow-hidden">
                  {/* Header row */}
                  <div className="hidden sm:grid grid-cols-[24px_1fr_80px_44px] gap-3 px-4 py-2 text-xs uppercase tracking-wide text-[#B3B3B3] border-b border-[#222222]">
                    <span className="text-center">#</span>
                    <span>Title</span>
                    <span className="text-right">Time</span>
                    <span></span>
                  </div>
                  {tracks.map((track, index) => (
                    <div
                      key={`${track.id}-${index}`}
                      className="group grid grid-cols-[24px_1fr_auto] sm:grid-cols-[24px_1fr_80px_44px] gap-3 items-center px-2 sm:px-4 py-2 hover:bg-[#222222] transition-colors border-b border-[#222222] last:border-0"
                    >
                      <button
                        onClick={() => handlePlayTrack(index)}
                        className="text-sm text-[#B3B3B3] group-hover:hidden text-center w-6"
                        aria-label={`Play ${track.title}`}
                      >
                        {index + 1}
                      </button>
                      <button
                        onClick={() => handlePlayTrack(index)}
                        className="hidden group-hover:flex items-center justify-center w-6 text-[#1DB954]"
                        aria-label={`Play ${track.title}`}
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <button
                        onClick={() => handlePlayTrack(index)}
                        className="flex items-center gap-3 min-w-0 text-left"
                      >
                        <div className="w-11 h-11 sm:hidden rounded-lg overflow-hidden flex-shrink-0">
                          <SmartImage
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {truncate(track.title, 40)}
                          </p>
                          <p className="text-xs text-[#B3B3B3] truncate sm:hidden">
                            {truncate(track.artist, 28)}
                          </p>
                        </div>
                      </button>
                      <span className="text-xs text-[#B3B3B3] text-right hidden sm:block">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={() => toggleLike(track)}
                        aria-label={isLiked(track.id) ? 'Unlike' : 'Like'}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          isLiked(track.id)
                            ? 'text-[#1DB954]'
                            : 'text-[#B3B3B3] hover:text-white'
                        }`}
                      >
                        <Heart
                          size={16}
                          fill={isLiked(track.id) ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}
