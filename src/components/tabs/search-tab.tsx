'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  TrendingUp,
  Clock,
  Music2,
  Play,
  Mic,
  MicOff,
  Heart,
  Loader2,
  Flame,
  User,
  Disc3,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';
import { unifiedSearch } from '@/lib/music-aggregator';
import { formatDuration, formatViewCount } from '@/lib/youtube-api';
import type { Track, SearchResult } from '@/types';

// ---- Category Data ----

interface BrowseCategory {
  name: string;
  gradient: string;
  icon: string;
}

const BROWSE_CATEGORIES: BrowseCategory[] = [
  { name: 'Bollywood', gradient: 'from-rose-600 to-orange-500', icon: '🎬' },
  { name: 'Punjabi', gradient: 'from-amber-500 to-yellow-400', icon: '🪘' },
  { name: 'Hindi Romantic', gradient: 'from-pink-500 to-rose-400', icon: '💕' },
  { name: 'Lo-Fi India', gradient: 'from-violet-500 to-purple-400', icon: '☕' },
  { name: 'Haryanvi', gradient: 'from-red-600 to-red-400', icon: '🎤' },
  { name: 'Tamil', gradient: 'from-cyan-500 to-blue-400', icon: '🎵' },
  { name: 'Telugu', gradient: 'from-emerald-600 to-teal-400', icon: '🎶' },
  { name: 'Bhojpuri', gradient: 'from-orange-500 to-amber-400', icon: '🥁' },
  { name: 'Devotional', gradient: 'from-yellow-500 to-amber-400', icon: '🙏' },
  { name: 'Workout India', gradient: 'from-lime-500 to-green-400', icon: '💪' },
  { name: 'Marathi', gradient: 'from-sky-500 to-indigo-400', icon: '🎻' },
  { name: 'Gujarati', gradient: 'from-fuchsia-500 to-pink-400', icon: '🎹' },
  { name: 'Bengali', gradient: 'from-slate-500 to-zinc-400', icon: '🎸' },
  { name: 'Kannada', gradient: 'from-teal-500 to-cyan-400', icon: '🎵' },
  { name: 'Malayalam', gradient: 'from-indigo-500 to-blue-400', icon: '🎶' },
  { name: 'Indian Classical', gradient: 'from-amber-600 to-yellow-500', icon: '🎻' },
];

const TRENDING_SEARCHES = [
  'Arijit Singh hits',
  'Bollywood hits 2025',
  'AP Dhillon',
  'Punjabi hits',
  'Pritam melodies',
  'Hindi romantic songs',
  'Lo-Fi India',
  'Shreya Ghoshal',
  'Tamil hits',
  'Haryanvi songs',
];

// ---- Filter Tab Types ----

type FilterTab = 'all' | 'songs' | 'artists' | 'albums' | 'playlists';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'songs', label: 'Songs' },
  { key: 'artists', label: 'Artists' },
  { key: 'albums', label: 'Albums' },
  { key: 'playlists', label: 'Playlists' },
];

// ---- Skeleton Components ----

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-2 animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-[#282828] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-[#282828]" />
        <div className="h-3 w-1/2 rounded bg-[#282828]" />
      </div>
    </div>
  );
}

function SkeletonArtistCard() {
  return (
    <div className="flex-shrink-0 w-28 animate-pulse">
      <div className="w-28 h-28 rounded-full bg-[#282828] mx-auto" />
      <div className="h-3 w-20 rounded bg-[#282828] mx-auto mt-2" />
    </div>
  );
}

function SkeletonAlbumCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-2xl bg-[#282828]" />
      <div className="h-3 w-3/4 rounded bg-[#282828] mt-2" />
      <div className="h-3 w-1/2 rounded bg-[#282828] mt-1" />
    </div>
  );
}

// ---- Main Component ----

export function SearchTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { playQueue } = usePlayerStore();
  const {
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    removeSearchHistoryEntry,
    likedSongs,
    toggleLike,
    isLiked,
  } = useLibraryStore();

  // ---- Debounced Search ----

  const executeSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults(null);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);
        addSearchHistory(trimmed);
        const searchResults = await unifiedSearch(trimmed, 25);
        setResults(searchResults);
        setActiveFilter('all');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Search failed:', err);
        setError('Search failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [addSearchHistory]
  );

  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        executeSearch(searchQuery);
      }, 300);
    },
    [executeSearch]
  );

  // ---- Input Handlers ----

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      if (value.trim()) {
        debouncedSearch(value);
      } else {
        setResults(null);
        setError(null);
        setLoading(false);
      }
    },
    [debouncedSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        executeSearch(query);
      } else if (e.key === 'Escape') {
        setQuery('');
        setResults(null);
        setError(null);
        inputRef.current?.blur();
      }
    },
    [query, executeSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
    setLoading(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    inputRef.current?.focus();
  }, []);

  const handleQuickSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      executeSearch(q);
      inputRef.current?.blur();
    },
    [executeSearch]
  );

  // ---- Voice Search ----

  const handleVoiceSearch = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setQuery(transcript);
        executeSearch(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [executeSearch]);

  // ---- Auto Focus ----

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // ---- Cleanup ----

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ---- Play Handlers ----

  const handlePlayTrack = useCallback(
    (track: Track, trackList: Track[], index: number) => {
      playQueue(trackList, index, `search:${query}`);
    },
    [playQueue, query]
  );

  // ---- Filtered Results ----

  const filteredResults = useMemo(() => {
    if (!results) return null;

    switch (activeFilter) {
      case 'songs':
        return { ...results, artists: [], albums: [], playlists: [] };
      case 'artists':
        return { ...results, tracks: [], albums: [], playlists: [] };
      case 'albums':
        return { ...results, tracks: [], artists: [], playlists: [] };
      case 'playlists':
        return { ...results, tracks: [], artists: [], albums: [] };
      default:
        return results;
    }
  }, [results, activeFilter]);

  const hasResults = filteredResults
    ? filteredResults.tracks.length > 0 ||
      filteredResults.artists.length > 0 ||
      filteredResults.albums.length > 0 ||
      filteredResults.playlists.length > 0
    : false;

  // ---- Render ----

  const showEmptyState = !results && !loading && !error;

  return (
    <div className="flex flex-col h-full bg-[#090909]">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-20 bg-[#090909]/95 backdrop-blur-lg px-4 pt-[env(safe-area-inset-top)] pb-3">
        <div className="flex items-center gap-2 pt-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#727272] pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Songs, artists, albums..."
              aria-label="Search music"
              className="w-full pl-11 pr-10 py-3 text-white text-sm rounded-[24px] border border-transparent focus:border-[#1DB954]/50 focus:outline-none placeholder:text-[#727272] transition-all duration-200"
              style={{
                backgroundColor: isFocused ? '#222222' : '#181818',
              }}
            />
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Loader2 size={16} className="text-[#1DB954] animate-spin" />
                </motion.div>
              )}
              {!loading && query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#333333] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} className="text-[#B3B3B3]" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Voice Search Button */}
          <motion.button
            onClick={handleVoiceSearch}
            whileTap={{ scale: 0.9 }}
            className="relative flex items-center justify-center w-11 h-11 rounded-full bg-[#181818] hover:bg-[#222222] transition-colors flex-shrink-0"
            aria-label="Voice search"
          >
            {isListening ? (
              <>
                <MicOff size={18} className="text-[#1DB954]" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[#1DB954]"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              </>
            ) : (
              <Mic size={18} className="text-[#B3B3B3]" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
        <AnimatePresence mode="wait">
          {/* ---- Loading State ---- */}
          {loading && !results && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Skeleton Songs */}
              <div className="space-y-1">
                <div className="h-4 w-20 rounded bg-[#282828] animate-pulse mb-2" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
              {/* Skeleton Artists */}
              <div>
                <div className="h-4 w-20 rounded bg-[#282828] animate-pulse mb-3" />
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonArtistCard key={i} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ---- Error State ---- */}
          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center mb-4">
                <Music2 size={24} className="text-[#727272]" />
              </div>
              <p className="text-[#B3B3B3] text-sm mb-1">Something went wrong</p>
              <p className="text-[#727272] text-xs mb-4">{error}</p>
              <button
                onClick={() => executeSearch(query)}
                className="px-6 py-2.5 bg-[#1DB954] text-black text-sm font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
              >
                Retry
              </button>
            </motion.div>
          )}

          {/* ---- Search Results ---- */}
          {results && !error && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className="relative flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    <span
                      className={
                        activeFilter === tab.key ? 'text-white' : 'text-[#727272] hover:text-[#B3B3B3]'
                      }
                    >
                      {tab.label}
                    </span>
                    {activeFilter === tab.key && (
                      <motion.div
                        layoutId="filter-underline"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1DB954] rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Loading overlay on existing results */}
              {loading && (
                <div className="flex items-center gap-2 py-2 mb-3">
                  <Loader2 size={14} className="text-[#1DB954] animate-spin" />
                  <span className="text-xs text-[#727272]">Updating results...</span>
                </div>
              )}

              {/* Songs */}
              {filteredResults && filteredResults.tracks.length > 0 && (
                <div className="mb-6">
                  {activeFilter === 'all' && (
                    <h3 className="text-sm font-semibold text-[#B3B3B3] uppercase tracking-wider mb-2">
                      Songs
                    </h3>
                  )}
                  <div className="space-y-0.5">
                    {filteredResults.tracks.map((track, index) => (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      >
                        <button
                          onClick={() => handlePlayTrack(track, filteredResults.tracks, index)}
                          className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-[#181818] active:bg-[#222222] transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                            {track.thumbnail ? (
                              <img
                                src={track.thumbnail}
                                alt={track.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                                <Music2 size={16} className="text-[#1DB954]" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                              <Play
                                size={16}
                                fill="white"
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-white truncate">{track.title}</p>
                            <p className="text-xs text-[#B3B3B3] truncate">
                              {track.artist}
                              {track.viewCount && (
                                <span className="ml-1.5">• {formatViewCount(track.viewCount)} views</span>
                              )}
                              {track.duration > 0 && (
                                <span className="ml-1.5">• {formatDuration(track.duration)}</span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(track);
                            }}
                            className="p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            aria-label={isLiked(track.id) ? 'Unlike' : 'Like'}
                          >
                            <Heart
                              size={16}
                              className={
                                isLiked(track.id)
                                  ? 'text-[#1DB954] fill-[#1DB954]'
                                  : 'text-[#727272] hover:text-white'
                              }
                            />
                          </button>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artists */}
              {filteredResults && filteredResults.artists.length > 0 && (
                <div className="mb-6">
                  {activeFilter === 'all' && (
                    <h3 className="text-sm font-semibold text-[#B3B3B3] uppercase tracking-wider mb-3">
                      Artists
                    </h3>
                  )}
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {filteredResults.artists.map((artist, index) => (
                      <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(index * 0.05, 0.3) }}
                        className="flex-shrink-0 w-28 text-center cursor-pointer group"
                      >
                        <div className="w-28 h-28 rounded-full overflow-hidden mx-auto shadow-lg relative">
                          {artist.thumbnail ? (
                            <img
                              src={artist.thumbnail}
                              alt={artist.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                              <User size={28} className="text-[#727272]" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium text-white mt-2 truncate">{artist.name}</p>
                        {artist.subscriberCount && (
                          <p className="text-[10px] text-[#727272]">
                            {formatViewCount(artist.subscriberCount)} subscribers
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums / Playlists */}
              {filteredResults && filteredResults.albums.length > 0 && (
                <div className="mb-6">
                  {activeFilter === 'all' && (
                    <h3 className="text-sm font-semibold text-[#B3B3B3] uppercase tracking-wider mb-3">
                      Albums & Playlists
                    </h3>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {filteredResults.albums.map((album, index) => (
                      <motion.div
                        key={album.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.04, 0.3) }}
                        className="cursor-pointer group"
                      >
                        <div className="aspect-square rounded-2xl overflow-hidden shadow-lg relative">
                          {album.thumbnail ? (
                            <img
                              src={album.thumbnail}
                              alt={album.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                              <Disc3 size={32} className="text-[#727272]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-xl">
                              <Play size={18} fill="black" className="text-black ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-white truncate mt-2">{album.title}</p>
                        <p className="text-xs text-[#B3B3B3] truncate">
                          {album.artist}
                          {album.trackCount && <span className="ml-1">• {album.trackCount} tracks</span>}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty results within filter */}
              {!hasResults && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <div className="w-20 h-20 rounded-full bg-[#181818] flex items-center justify-center mb-4">
                    <ListMusic size={32} className="text-[#727272]" />
                  </div>
                  <p className="text-white font-medium mb-1">No results found</p>
                  <p className="text-[#727272] text-sm text-center">
                    Try searching for something else
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ---- Empty State ---- */}
          {showEmptyState && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Recent Searches */}
              {searchHistory.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#B3B3B3]" />
                      <h3 className="text-sm font-semibold text-[#B3B3B3]">Recent Searches</h3>
                    </div>
                    <button
                      onClick={clearSearchHistory}
                      className="text-xs text-[#727272] hover:text-white transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {searchHistory.slice(0, 20).map((entry, index) => (
                      <motion.div
                        key={entry.id ?? index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.2) }}
                        className="group"
                      >
                        <div className="flex items-center">
                          <button
                            onClick={() => handleQuickSearch(entry.query)}
                            className="flex items-center gap-3 flex-1 py-2.5 px-1 rounded-lg hover:bg-[#181818] transition-colors"
                          >
                            <Clock size={14} className="text-[#727272] flex-shrink-0" />
                            <span className="text-sm text-white truncate">{entry.query}</span>
                          </button>
                          <button
                            onClick={() => {
                              if (entry.id !== undefined) {
                                removeSearchHistoryEntry(entry.id);
                              }
                            }}
                            className="p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-[#282828]"
                            aria-label="Remove from history"
                          >
                            <X size={14} className="text-[#727272]" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={16} className="text-[#1DB954]" />
                  <h3 className="text-sm font-semibold text-[#B3B3B3]">Trending</h3>
                </div>
                <div className="space-y-0.5">
                  {TRENDING_SEARCHES.map((term, index) => (
                    <motion.button
                      key={term}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      onClick={() => handleQuickSearch(term)}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 w-full py-2.5 px-1 rounded-lg hover:bg-[#181818] transition-colors"
                    >
                      <span className="text-sm font-bold text-[#1DB954] w-5 text-right flex-shrink-0">
                        {index + 1}
                      </span>
                      <TrendingUp size={14} className="text-[#727272] flex-shrink-0" />
                      <span className="text-sm text-white truncate">{term}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Browse Categories */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Music2 size={16} className="text-[#B3B3B3]" />
                  <h3 className="text-sm font-semibold text-[#B3B3B3]">Browse All</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {BROWSE_CATEGORIES.map((category, index) => (
                    <motion.button
                      key={category.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      onClick={() => handleQuickSearch(category.name)}
                      whileTap={{ scale: 0.96 }}
                      className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${category.gradient} text-left aspect-[2/1] group`}
                    >
                      <span className="text-2xl mb-1 block">{category.icon}</span>
                      <span className="text-sm font-bold text-white drop-shadow-lg">
                        {category.name}
                      </span>
                      <div className="absolute -bottom-2 -right-2 text-4xl opacity-20 rotate-12 group-hover:rotate-6 transition-transform">
                        {category.icon}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
