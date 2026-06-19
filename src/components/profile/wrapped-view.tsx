'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronDown,
  Share2,
  Music2,
  Clock,
  Headphones,
  Mic2,
  Sparkles,
  TrendingUp,
  Heart,
  Zap,
  Compass,
  Shield,
} from 'lucide-react';
import { useUserStore } from '@/stores/user-store';
import { useLibraryStore } from '@/stores/library-store';
import { getYearlyReport, getTopSongs, getTopArtists, getTopGenres, getListeningTime, getListeningStreak, getTotalPlays } from '@/lib/history-engine';
import type { Track, Artist } from '@/types';

interface WrappedViewProps {
  onClose: () => void;
}

// Sample data for when real data is insufficient
const SAMPLE_TOP_SONGS: Track[] = [
  { id: '1', videoId: 'v1', title: 'Blinding Lights', artist: 'The Weeknd', thumbnail: '', duration: 200, channelTitle: 'The Weeknd', addedAt: Date.now() },
  { id: '2', videoId: 'v2', title: 'Levitating', artist: 'Dua Lipa', thumbnail: '', duration: 203, channelTitle: 'Dua Lipa', addedAt: Date.now() },
  { id: '3', videoId: 'v3', title: 'Stay', artist: 'The Kid LAROI', thumbnail: '', duration: 141, channelTitle: 'The Kid LAROI', addedAt: Date.now() },
  { id: '4', videoId: 'v4', title: 'Peaches', artist: 'Justin Bieber', thumbnail: '', duration: 198, channelTitle: 'Justin Bieber', addedAt: Date.now() },
  { id: '5', videoId: 'v5', title: 'Save Your Tears', artist: 'The Weeknd', thumbnail: '', duration: 215, channelTitle: 'The Weeknd', addedAt: Date.now() },
];

const SAMPLE_TOP_ARTISTS: Artist[] = [
  { id: 'a1', channelId: 'c1', name: 'The Weeknd', thumbnail: '' },
  { id: 'a2', channelId: 'c2', name: 'Dua Lipa', thumbnail: '' },
  { id: 'a3', channelId: 'c3', name: 'Justin Bieber', thumbnail: '' },
  { id: 'a4', channelId: 'c4', name: 'Arijit Singh', thumbnail: '' },
  { id: 'a5', channelId: 'c5', name: 'Ed Sheeran', thumbnail: '' },
];

const GRADIENT_SLIDES = [
  'from-[#1DB954]/40 via-[#090909] to-[#090909]',
  'from-[#E13300]/40 via-[#090909] to-[#090909]',
  'from-[#1DB954]/30 via-[#148F3F]/20 to-[#090909]',
  'from-[#8B5CF6]/30 via-[#090909] to-[#090909]',
  'from-[#F59E0B]/30 via-[#090909] to-[#090909]',
  'from-[#EC4899]/30 via-[#090909] to-[#090909]',
  'from-[#1DB954]/20 via-[#148F3F]/30 to-[#090909]',
  'from-[#06B6D4]/30 via-[#090909] to-[#090909]',
  'from-[#1DB954]/40 via-[#090909] to-[#148F3F]/20',
];

function AnimatedCounter({ target, duration = 2000, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

function getListeningPersonality(topGenres: string[], topArtists: Artist[], totalMinutes: number): { type: string; icon: React.ReactNode; description: string } {
  if (totalMinutes > 5000) {
    return { type: 'The Devotee', icon: <Shield className="w-10 h-10 text-[#1DB954]" />, description: 'Music isn\'t just background noise for you—it\'s your life soundtrack. You live and breathe every beat.' };
  }
  if (topGenres.length > 3) {
    return { type: 'The Explorer', icon: <Compass className="w-10 h-10 text-[#F59E0B]" />, description: 'You never settle for one sound. Your taste spans genres, moods, and continents.' };
  }
  if (topArtists.length > 0 && topArtists.length <= 2) {
    return { type: 'The Loyalist', icon: <Heart className="w-10 h-10 text-[#EC4899]" />, description: 'When you find your sound, you stick with it. Your favorites are your forever artists.' };
  }
  if (totalMinutes > 2000) {
    return { type: 'The Enthusiast', icon: <Zap className="w-10 h-10 text-[#E13300]" />, description: 'You bring energy to every listening session. Your playlists are pure fire.' };
  }
  return { type: 'The Curator', icon: <Sparkles className="w-10 h-10 text-[#8B5CF6]" />, description: 'You carefully craft every moment with the perfect soundtrack. Music is your art.' };
}

export function WrappedView({ onClose }: WrappedViewProps) {
  const { profile, stats } = useUserStore();
  const { likedSongs } = useLibraryStore();

  const [topSongs, setTopSongs] = useState<Track[]>(SAMPLE_TOP_SONGS);
  const [topArtists, setTopArtists] = useState<Artist[]>(SAMPLE_TOP_ARTISTS);
  const [topGenres, setTopGenres] = useState<string[]>(['Pop', 'Rock', 'Electronic', 'Hip Hop', 'R&B']);
  const [totalMinutes, setTotalMinutes] = useState(stats.totalListeningTime);
  const [streak, setStreak] = useState(0);
  const [totalPlays, setTotalPlays] = useState(stats.totalTracksPlayed);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [songs, artists, genres, minutes, streakDays, plays] = await Promise.all([
          getTopSongs('year'),
          getTopArtists('year'),
          getTopGenres('year'),
          getListeningTime('year'),
          getListeningStreak(),
          getTotalPlays(),
        ]);
        if (songs.length > 0) setTopSongs(songs.slice(0, 5));
        if (artists.length > 0) setTopArtists(artists.slice(0, 5));
        if (genres.length > 0) setTopGenres(genres);
        if (minutes > 0) setTotalMinutes(minutes);
        if (streakDays > 0) setStreak(streakDays);
        if (plays > 0) setTotalPlays(plays);
      } catch {
        // Use sample data as fallback
      }
    }
    loadData();
  }, [stats.totalListeningTime, stats.totalTracksPlayed]);

  const personality = getListeningPersonality(topGenres, topArtists, totalMinutes);
  const totalHours = Math.floor(totalMinutes / 60);
  const avgMinutesPerDay = Math.round(totalMinutes / 365);

  const handleShare = useCallback(async () => {
    const shareText = `🎵 My SAAVNIFY Wrapped\n\n⏱ ${totalHours} hours listened\n🎶 ${totalPlays} songs played\n🎤 Top: ${topArtists[0]?.name || 'Unknown'}\n🎵 Fav: ${topSongs[0]?.title || 'Unknown'}\n🔥 ${streak} day streak\n\n#SAAVNIFYWrapped`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'SAAVNIFY Wrapped', text: shareText });
        return;
      } catch {
        // fallback to copy
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  }, [totalHours, totalPlays, topArtists, topSongs, streak]);

  const slides = [
    // Slide 1: Intro
    <div key="intro" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[0]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-[#1DB954]/20 flex items-center justify-center mx-auto mb-6">
          <Music2 className="w-10 h-10 text-[#1DB954]" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Your Year</h1>
        <h1 className="text-4xl font-black text-[#1DB954] mb-4">In Music</h1>
        <p className="text-[#B3B3B3] text-sm">{profile.name}, let&apos;s look back at your journey</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 flex flex-col items-center z-10"
      >
        <span className="text-[#B3B3B3] text-xs mb-1">Scroll down</span>
        <ChevronDown className="w-5 h-5 text-[#B3B3B3] animate-bounce" />
      </motion.div>
    </div>,

    // Slide 2: Total Listening Time
    <div key="listening-time" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[1]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <Clock className="w-12 h-12 text-[#E13300] mx-auto mb-4" />
        <p className="text-[#B3B3B3] text-sm mb-2">You spent</p>
        <div className="text-7xl font-black text-white mb-2">
          <AnimatedCounter target={totalHours} suffix="" />
        </div>
        <p className="text-2xl font-bold text-[#B3B3B3] mb-6">hours listening</p>
        <div className="bg-[#181818]/80 rounded-2xl p-4 backdrop-blur-sm">
          <p className="text-[#B3B3B3] text-xs">That&apos;s about</p>
          <p className="text-xl font-bold text-white">{Math.floor(totalHours / 24)} days</p>
          <p className="text-[#B3B3B3] text-xs mt-1">of non-stop music</p>
        </div>
      </motion.div>
    </div>,

    // Slide 3: Top Song
    <div key="top-song" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[2]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <p className="text-[#B3B3B3] text-sm mb-4">Your #1 song</p>
        <div className="w-48 h-48 rounded-2xl bg-[#181818] mx-auto mb-6 overflow-hidden shadow-2xl shadow-[#1DB954]/20">
          {topSongs[0]?.thumbnail ? (
            <img src={topSongs[0].thumbnail} alt={topSongs[0].title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1DB954]/30 to-[#181818]">
              <Music2 className="w-16 h-16 text-[#1DB954]" />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-black text-white mb-1">{topSongs[0]?.title || 'Unknown'}</h2>
        <p className="text-[#B3B3B3] text-sm">{topSongs[0]?.artist || 'Unknown Artist'}</p>
        <div className="mt-4 flex items-center justify-center gap-1 text-[#1DB954]">
          <Headphones className="w-4 h-4" />
          <span className="text-sm font-medium">{totalPlays > 0 ? Math.ceil(totalPlays / topSongs.length) : 1} plays</span>
        </div>
      </motion.div>
    </div>,

    // Slide 4: Top Artist
    <div key="top-artist" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[3]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <p className="text-[#B3B3B3] text-sm mb-4">Your #1 artist</p>
        <div className="w-36 h-36 rounded-full bg-[#181818] mx-auto mb-6 overflow-hidden ring-4 ring-[#8B5CF6]/30 shadow-2xl shadow-[#8B5CF6]/20">
          {topArtists[0]?.thumbnail ? (
            <img src={topArtists[0].thumbnail} alt={topArtists[0].name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#8B5CF6]/30 to-[#181818]">
              <Mic2 className="w-12 h-12 text-[#8B5CF6]" />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-black text-white mb-1">{topArtists[0]?.name || 'Unknown'}</h2>
        <p className="text-[#B3B3B3] text-sm">Your most played artist this year</p>
      </motion.div>
    </div>,

    // Slide 5: Top Genre
    <div key="top-genre" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[4]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <p className="text-[#B3B3B3] text-sm mb-6">Your top genres</p>
        <div className="space-y-3 w-full max-w-xs">
          {topGenres.slice(0, 5).map((genre, i) => (
            <motion.div
              key={genre}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <span className="text-lg font-bold text-[#B3B3B3] w-6">#{i + 1}</span>
              <div className="flex-1 bg-[#181818]/80 rounded-xl p-3 backdrop-blur-sm">
                <span className={`font-bold ${i === 0 ? 'text-[#F59E0B] text-xl' : 'text-white text-base'}`}>
                  {genre.charAt(0).toUpperCase() + genre.slice(1)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>,

    // Slide 6: Listening Personality
    <div key="personality" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[5]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <p className="text-[#B3B3B3] text-sm mb-6">Your listening personality</p>
        <div className="bg-[#181818]/80 rounded-3xl p-8 backdrop-blur-sm border border-[#EC4899]/20">
          <div className="flex justify-center mb-4">
            {personality.icon}
          </div>
          <h2 className="text-3xl font-black text-white mb-3">{personality.type}</h2>
          <p className="text-[#B3B3B3] text-sm leading-relaxed">{personality.description}</p>
        </div>
      </motion.div>
    </div>,

    // Slide 7: Top 5 Songs
    <div key="top-5" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[6]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-sm"
      >
        <p className="text-[#B3B3B3] text-sm mb-4 text-center">Your top 5 songs</p>
        <div className="space-y-2">
          {topSongs.slice(0, 5).map((song, i) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-3 bg-[#181818]/80 rounded-xl p-3 backdrop-blur-sm"
            >
              <span className="text-lg font-bold text-[#1DB954] w-6 text-center">{i + 1}</span>
              <div className="w-10 h-10 rounded-lg bg-[#282828] overflow-hidden flex-shrink-0">
                {song.thumbnail ? (
                  <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 className="w-4 h-4 text-[#1DB954]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{song.title}</p>
                <p className="text-[#B3B3B3] text-xs truncate">{song.artist}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>,

    // Slide 8: Average per day
    <div key="avg-per-day" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[7]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <TrendingUp className="w-12 h-12 text-[#06B6D4] mx-auto mb-4" />
        <p className="text-[#B3B3B3] text-sm mb-2">On average, you listened to</p>
        <div className="text-6xl font-black text-white mb-2">
          <AnimatedCounter target={avgMinutesPerDay} suffix="" />
        </div>
        <p className="text-xl font-bold text-[#B3B3B3] mb-6">minutes per day</p>
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="bg-[#181818]/80 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xl font-bold text-white">{totalPlays}</p>
            <p className="text-[#B3B3B3] text-xs">Total plays</p>
          </div>
          <div className="bg-[#181818]/80 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xl font-bold text-white">{streak}</p>
            <p className="text-[#B3B3B3] text-xs">Day streak</p>
          </div>
          <div className="bg-[#181818]/80 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xl font-bold text-white">{likedSongs.length}</p>
            <p className="text-[#B3B3B3] text-xs">Liked songs</p>
          </div>
          <div className="bg-[#181818]/80 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xl font-bold text-white">{topGenres.length}</p>
            <p className="text-[#B3B3B3] text-xs">Genres explored</p>
          </div>
        </div>
      </motion.div>
    </div>,

    // Slide 9: Share Card
    <div key="share" className={`min-h-[85vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b ${GRADIENT_SLIDES[8]} rounded-3xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#090909]" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <div className="bg-[#181818]/90 rounded-3xl p-6 backdrop-blur-sm border border-[#1DB954]/20 max-w-xs mx-auto">
          <h2 className="text-2xl font-black text-[#1DB954] mb-1">SAAVNIFY</h2>
          <p className="text-[#B3B3B3] text-xs mb-4">Wrapped {new Date().getFullYear()}</p>
          <div className="space-y-2 text-left mb-4">
            <div className="flex justify-between">
              <span className="text-[#B3B3B3] text-sm">Time listened</span>
              <span className="text-white text-sm font-bold">{totalHours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B3B3B3] text-sm">Songs played</span>
              <span className="text-white text-sm font-bold">{totalPlays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B3B3B3] text-sm">Top artist</span>
              <span className="text-white text-sm font-bold truncate ml-2">{topArtists[0]?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B3B3B3] text-sm">Top song</span>
              <span className="text-white text-sm font-bold truncate ml-2">{topSongs[0]?.title || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#B3B3B3] text-sm">Personality</span>
              <span className="text-[#1DB954] text-sm font-bold">{personality.type}</span>
            </div>
          </div>
          <div className="h-px bg-[#282828] mb-3" />
          <p className="text-[#727272] text-[10px]">Profile: {profile.name}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#1DB954] rounded-full text-white font-bold text-sm shadow-lg shadow-[#1DB954]/30"
        >
          <Share2 className="w-4 h-4" />
          Share Your Wrapped
        </motion.button>
      </motion.div>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#090909] overflow-hidden">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-[#181818]/80 flex items-center justify-center backdrop-blur-sm"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Slide counter */}
      <div className="absolute top-4 left-4 z-50">
        <span className="text-[#B3B3B3] text-xs font-medium">
          {currentSlide + 1} / {slides.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-1">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentSlide ? 'w-6 bg-[#1DB954]' : 'w-1.5 bg-[#282828]'
            }`}
          />
        ))}
      </div>

      {/* Scrollable slides */}
      <div
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          const slideHeight = e.currentTarget.clientHeight;
          setCurrentSlide(Math.round(scrollTop / slideHeight));
        }}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="space-y-2 p-2">
          {slides.map((slide, i) => (
            <div key={i} className="snap-center">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Share toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#181818] border border-[#1DB954]/30 rounded-full px-4 py-2 text-white text-sm shadow-lg"
          >
            Copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
