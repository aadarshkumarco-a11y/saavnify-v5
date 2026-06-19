"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Disc3, RefreshCw, Music, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getInnertubeNewReleases, searchInnertube } from '@/lib/sources/innertube-api';
import type { Album } from '@/types';

// ---- Helpers ----

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function AlbumImage({
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
        <Disc3 size={28} className="text-[#1DB954]/60 animate-spin-slow" />
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

function AlbumCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="h-3.5 w-3/4 mt-2.5 rounded-full" />
      <Skeleton className="h-2.5 w-1/2 mt-1.5 rounded-full" />
    </div>
  );
}

// ---- Main Component ----

interface NewReleasesScreenProps {
  onOpenAlbum?: (browseId: string) => void;
}

export function NewReleasesScreen({ onOpenAlbum }: NewReleasesScreenProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      let result = await getInnertubeNewReleases(30);
      if (result.length === 0) {
        // Fallback: derive albums from a search
        const fallback = await searchInnertube('new music 2024', 30);
        result = fallback.tracks
          .filter((t) => t.thumbnail)
          .slice(0, 30)
          .map((t, i) => ({
            id: t.id || `al-${i}`,
            playlistId: '',
            title: t.album || t.title,
            artist: t.artist,
            thumbnail: t.thumbnail,
          }));
      }
      setAlbums(result);
    } catch (err) {
      console.error('New releases load failed:', err);
      setError('Could not load new releases. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClick = (album: Album) => {
    if (!onOpenAlbum) return;
    if (!album.playlistId) {
      return;
    }
    onOpenAlbum(album.playlistId);
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
              <Disc3 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                New Releases
              </h1>
              <p className="text-xs text-[#B3B3B3]">
                Fresh albums straight from the charts
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => load(true)}
            disabled={refreshing}
            aria-label="Refresh new releases"
            className="rounded-full hover:bg-[#1DB954]/10 hover:text-[#1DB954]"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </motion.div>

        {/* Stat row */}
        {!loading && albums.length > 0 && (
          <div className="flex items-center gap-2 mb-5 text-xs text-[#B3B3B3]">
            <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
              {albums.length} albums
            </Badge>
            <span>Tap any album to view its tracks.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <AlbumCardSkeleton key={i} />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="bg-[#181818] rounded-2xl py-16 text-center">
            <Music size={40} className="mx-auto text-[#1DB954]/40 mb-3" />
            <p className="text-sm text-[#B3B3B3]">No new releases found.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              className="mt-4 bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
            >
              <RefreshCw size={14} className="mr-2" /> Try again
            </Button>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.04 },
              },
            }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {albums.map((album) => {
              const openable = !!album.playlistId && !!onOpenAlbum;
              return (
                <motion.button
                  key={album.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: openable ? 1.03 : 1 }}
                  whileTap={{ scale: openable ? 0.97 : 1 }}
                  onClick={() => handleClick(album)}
                  disabled={!openable}
                  className="text-left group disabled:cursor-default"
                  aria-label={`Open album ${album.title}`}
                >
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-lg bg-[#181818]">
                    <AlbumImage
                      src={album.thumbnail}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {openable && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white truncate mt-2">
                    {truncate(album.title, 22)}
                  </p>
                  <p className="text-xs text-[#B3B3B3] truncate">
                    {truncate(album.artist, 22) || 'Unknown artist'}
                  </p>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
