'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  User as UserIcon,
  Clock,
  Music,
  Flame,
  Heart,
  ListMusic,
  Tag,
  Edit3,
  Check,
  Lock,
  ChevronRight,
  Info,
  Star,
  Shield,
  Moon,
  Palette,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  AlertTriangle,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { useUserStore } from '@/stores/user-store';
import { useLibraryStore } from '@/stores/library-store';
import { useThemeStore, THEME_PRESETS } from '@/stores/theme-store';
import { toast } from '@/hooks/use-toast';
import { getApiKey, setApiKey, removeApiKey, validateApiKey, getKeyStatus, testCurrentKey } from '@/lib/api-key-manager';
import type { ThemeName, Artist, Track } from '@/types';

// ─── Count-Up Hook ───────────────────────────────────────────
function useCountUp(end: number, duration: number = 1200) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let startTime: number | null = null;
    let raf: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return count;
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({
  icon: Icon,
  value,
  label,
  suffix = '',
  accentColor,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: number;
  label: string;
  suffix?: string;
  accentColor: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="bg-[#181818] rounded-2xl p-3.5 flex flex-col items-start gap-1.5">
      <Icon size={18} style={{ color: accentColor }} />
      <p className="text-xl font-bold text-white leading-none">
        {animated.toLocaleString()}
        {suffix}
      </p>
      <p className="text-[11px] text-[#B3B3B3] leading-none">{label}</p>
    </div>
  );
}

// ─── Sample / Fallback Data ──────────────────────────────────
const SAMPLE_WEEKLY_DATA = [
  { day: 'Mon', minutes: 45 },
  { day: 'Tue', minutes: 62 },
  { day: 'Wed', minutes: 38 },
  { day: 'Thu', minutes: 74 },
  { day: 'Fri', minutes: 90 },
  { day: 'Sat', minutes: 110 },
  { day: 'Sun', minutes: 55 },
];

const SAMPLE_GENRE_DATA = [
  { name: 'Pop', value: 35 },
  { name: 'Bollywood', value: 25 },
  { name: 'Lo-Fi', value: 18 },
  { name: 'Hip Hop', value: 14 },
  { name: 'Rock', value: 8 },
];

const GENRE_COLORS = ['#1DB954', '#FF6B6B', '#A855F7', '#F59E0B', '#EC4899'];

const ACCENT_COLORS = [
  { color: '#1DB954', label: 'Green' },
  { color: '#EF4444', label: 'Red' },
  { color: '#A855F7', label: 'Purple' },
  { color: '#F97316', label: 'Orange' },
  { color: '#3B82F6', label: 'Blue' },
  { color: '#EC4899', label: 'Pink' },
];

const SETTINGS_LINKS = [
  { icon: Info, label: 'About', desc: 'SAAVNIFY Music' },
  { icon: Star, label: 'Version', desc: '1.0.4' },
  { icon: Heart, label: 'Rate App', desc: 'Enjoying SAAVNIFY?' },
  { icon: Shield, label: 'Privacy', desc: 'Your data, your control' },
];

// ─── API Key Manager Component ────────────────────────────────
function ApiKeyManager() {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);
  const [showManager, setShowManager] = useState(false);

  const keyStatus = getKeyStatus();
  const currentKey = getApiKey();

  const handleValidate = async () => {
    if (!keyInput.trim()) return;
    setValidating(true);
    setValidationResult(null);
    const result = await validateApiKey(keyInput.trim());
    setValidationResult(result);
    setValidating(false);
    if (result.valid) {
      toast({ title: 'API Key Connected', description: 'Your YouTube API key is now active.' });
    }
  };

  const handleTest = async () => {
    setValidating(true);
    setValidationResult(null);
    const result = await testCurrentKey();
    setValidationResult(result);
    setValidating(false);
    if (result.valid) {
      toast({ title: 'API Key Valid', description: 'Connection to YouTube API successful.' });
    } else {
      toast({ title: 'API Key Invalid', description: result.error || 'Connection failed.', variant: 'destructive' });
    }
  };

  const handleRemove = () => {
    removeApiKey();
    setKeyInput('');
    setValidationResult(null);
    toast({ title: 'API Key Removed', description: 'You will need to add a key to use the app.' });
  };

  return (
    <div className="bg-[#181818] rounded-2xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setShowManager(!showManager)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[#222222] transition-colors"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: keyStatus.hasKey ? '#1DB95415' : '#E9142915' }}
        >
          <Key size={18} style={{ color: keyStatus.hasKey ? '#1DB954' : '#E91429' }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">YouTube API Key</p>
          <p className="text-[11px] text-[#727272]">
            {keyStatus.hasKey
              ? `Active — ${keyStatus.keyPreview}`
              : 'Not configured — Add your key'}
          </p>
        </div>
        <ChevronRight
          size={16}
          className={`text-[#727272] transition-transform ${showManager ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expanded manager */}
      {showManager && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 pb-4 space-y-3"
        >
          {/* Status indicator */}
          {keyStatus.hasKey && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20">
              <Check size={14} className="text-[#1DB954]" />
              <span className="text-xs text-[#1DB954] font-medium">API key configured</span>
            </div>
          )}

          {!keyStatus.hasKey && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[#E91429]/10 border border-[#E91429]/20">
              <AlertTriangle size={14} className="text-[#E91429] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-[#E91429] font-medium">API key required</p>
                <p className="text-[10px] text-[#B3B3B3] mt-0.5">
                  You need a YouTube Data API v3 key to search and stream music.
                </p>
              </div>
            </div>
          )}

          {/* Get key link */}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#1DB954] text-xs font-medium hover:underline"
          >
            Get your free API key <ExternalLink size={12} />
          </a>

          {/* Key input */}
          <div>
            <label className="block text-[11px] font-medium text-[#B3B3B3] mb-1.5">
              {currentKey ? 'Update API Key' : 'Enter API Key'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setValidationResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2.5 pr-10 bg-[#121212] border border-[#282828] rounded-xl text-white text-sm placeholder-[#727272] focus:outline-none focus:border-[#1DB954] transition-colors"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#727272] hover:text-white transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Validation result */}
          {validationResult && (
            <div
              className={`rounded-xl p-2.5 flex items-start gap-2 ${
                validationResult.valid
                  ? 'bg-[#1DB954]/10 border border-[#1DB954]/20'
                  : 'bg-[#E91429]/10 border border-[#E91429]/20'
              }`}
            >
              {validationResult.valid ? (
                <Check size={14} className="text-[#1DB954] flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle size={14} className="text-[#E91429] flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-xs font-medium ${validationResult.valid ? 'text-[#1DB954]' : 'text-[#E91429]'}`}>
                  {validationResult.valid ? 'Connected' : 'Invalid'}
                </p>
                {validationResult.error && (
                  <p className="text-[10px] text-[#B3B3B3] mt-0.5">{validationResult.error}</p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleValidate}
              disabled={!keyInput.trim() || validating}
              className="flex-1 py-2.5 bg-[#1DB954] text-white text-sm font-semibold rounded-xl hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {validating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Shield size={14} />
                  Validate & Save
                </>
              )}
            </button>

            {currentKey && (
              <button
                onClick={handleTest}
                disabled={validating}
                className="px-4 py-2.5 bg-[#282828] text-white text-sm rounded-xl hover:bg-[#333] transition-colors disabled:opacity-40"
              >
                Test
              </button>
            )}
          </div>

          {/* Remove key button */}
          {currentKey && (
            <button
              onClick={handleRemove}
              className="w-full py-2 text-[#E91429] text-xs font-medium hover:bg-[#E91429]/10 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 size={12} />
              Remove API Key
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function ProfileTab() {
  const {
    profile,
    achievements,
    stats,
    favoriteArtists,
    updateProfile,
  } = useUserStore();
  const { likedSongs, playlists, history } = useLibraryStore();
  const {
    selectedTheme,
    accentColor,
    amoledMode,
    setTheme,
    setAccentColor,
    setAmoledMode,
  } = useThemeStore();

  // ── Inline edit states ──
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.name);
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(profile.bio);

  // ── Derived stats ──
  const totalListeningHours = Math.floor(stats.totalListeningTime / 60);
  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  // ── Compute analytics from history (memoized) ──
  const analytics = useMemo(() => {
    // Top artists from history
    const artistCounts = new Map<string, { artist: Artist; count: number }>();
    for (const entry of history) {
      const key = entry.track.channelTitle;
      const existing = artistCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        artistCounts.set(key, {
          artist: {
            id: `artist-${entry.track.videoId}`,
            channelId: key,
            name: entry.track.artist || key,
            thumbnail: entry.track.thumbnail,
          },
          count: 1,
        });
      }
    }
    const sortedArtists = Array.from(artistCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const topArtists =
      sortedArtists.length > 0
        ? sortedArtists.map((s) => s.artist)
        : favoriteArtists.slice(0, 5);

    // Top songs from history
    const songCounts = new Map<string, { track: Track; count: number }>();
    for (const entry of history) {
      const existing = songCounts.get(entry.songId);
      if (existing) {
        existing.count += 1;
      } else {
        songCounts.set(entry.songId, { track: entry.track, count: 1 });
      }
    }
    const topSongs = Array.from(songCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => s.track);

    // Weekly listening data (last 7 days)
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentHistory = history.filter((e) => e.playedAt >= weekAgo);
    const dailyMap = new Map<string, number>();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      dailyMap.set(dayNames[d.getDay()], 0);
    }
    for (const entry of recentHistory) {
      const d = new Date(entry.playedAt);
      const dayName = dayNames[d.getDay()];
      const mins = (entry.playDuration || 0) / 60;
      dailyMap.set(dayName, (dailyMap.get(dayName) || 0) + mins);
    }
    const weekArr = Array.from(dailyMap.entries()).map(([day, minutes]) => ({
      day,
      minutes: Math.round(minutes),
    }));
    const hasData = weekArr.some((d) => d.minutes > 0);
    const weeklyData = hasData ? weekArr : SAMPLE_WEEKLY_DATA;

    // Genre distribution
    const genreCounts = new Map<string, number>();
    for (const entry of history) {
      const genres = extractGenreKeywords(entry.track.title, entry.track.artist);
      for (const genre of genres) {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      }
    }
    const sortedGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const total = sortedGenres.reduce((s, g) => s + g[1], 0);
    const genreData =
      sortedGenres.length > 0
        ? sortedGenres.map(([name, val]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: Math.round((val / total) * 100),
          }))
        : SAMPLE_GENRE_DATA;
    const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : 'General';

    // Streak
    const streakDays = new Set<string>();
    for (const entry of history) {
      const date = new Date(entry.playedAt).toISOString().split('T')[0];
      streakDays.add(date);
    }
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(today);
    if (!streakDays.has(checkDate.toISOString().split('T')[0])) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (streakDays.has(checkDate.toISOString().split('T')[0])) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return { topArtists, topSongs, weeklyData, genreData, topGenre, streak: currentStreak };
  }, [history, favoriteArtists]);

  const { topArtists, topSongs, weeklyData, genreData, topGenre, streak } = analytics;

  // ── Name/Bio save handlers ──
  const handleSaveName = () => {
    if (nameValue.trim()) {
      updateProfile({ name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handleSaveBio = () => {
    if (bioValue.trim()) {
      updateProfile({ bio: bioValue.trim() });
    }
    setEditingBio(false);
  };

  // ── Artist play count helper ──
  const getArtistPlayCount = (artist: Artist): number => {
    let count = 0;
    for (const entry of history) {
      if (
        entry.track.channelTitle === artist.channelId ||
        entry.track.artist === artist.name
      ) {
        count += 1;
      }
    }
    return count;
  };

  // ── Song play count helper ──
  const getSongPlayCount = (track: Track): number => {
    let count = 0;
    for (const entry of history) {
      if (entry.songId === track.id) count += 1;
    }
    return count;
  };

  // ── Achievement tap handler ──
  const handleAchievementTap = (achievement: (typeof achievements)[0]) => {
    if (achievement.unlockedAt) {
      toast({
        title: `${achievement.icon} ${achievement.title}`,
        description: `${achievement.description} — Unlocked!`,
      });
    } else {
      toast({
        title: `${achievement.icon} ${achievement.title}`,
        description: `${achievement.description} (${Math.round(achievement.progress)}% complete)`,
      });
    }
  };

  // ── Theme preset card colors ──
  const themeEntries = Object.entries(THEME_PRESETS) as [
    ThemeName,
    (typeof THEME_PRESETS)[ThemeName],
  ][];

  return (
    <div className="px-4 pt-[env(safe-area-inset-top)] pb-32 bg-[#090909] min-h-screen">
      {/* ═══════════════ 1. Profile Header ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pt-6 mb-5"
      >
        <div className="bg-[#181818] rounded-2xl p-6">
          <div className="flex flex-col items-center text-center">
            {/* Avatar with gradient ring */}
            <div className="relative mb-4">
              <div
                className="w-24 h-24 rounded-full p-[3px]"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88, #FF6B6B88)`,
                }}
              >
                <div className="w-full h-full rounded-full bg-[#181818] flex items-center justify-center overflow-hidden">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <UserIcon size={40} className="text-[#727272]" />
                  )}
                </div>
              </div>
            </div>

            {/* Editable Name */}
            {editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  onBlur={handleSaveName}
                  className="px-3 py-1 bg-[#282828] text-white text-lg font-bold rounded-lg border focus:outline-none"
                  style={{ borderColor: accentColor }}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1 group cursor-pointer">
                <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                <button
                  onClick={() => {
                    setNameValue(profile.name);
                    setEditingName(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[#282828]"
                >
                  <Edit3 size={14} className="text-[#B3B3B3]" />
                </button>
              </div>
            )}

            {/* Editable Bio */}
            {editingBio ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveBio()}
                  onBlur={handleSaveBio}
                  className="px-3 py-1 bg-[#282828] text-[#B3B3B3] text-sm rounded-lg border focus:outline-none"
                  style={{ borderColor: accentColor }}
                  autoFocus
                />
                <button
                  onClick={handleSaveBio}
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer">
                <p className="text-sm text-[#B3B3B3]">{profile.bio}</p>
                <button
                  onClick={() => {
                    setBioValue(profile.bio);
                    setEditingBio(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[#282828]"
                >
                  <Edit3 size={12} className="text-[#727272]" />
                </button>
              </div>
            )}

            {/* Edit Profile button */}
            <button
              onClick={() => {
                setNameValue(profile.name);
                setBioValue(profile.bio);
                setEditingName(true);
              }}
              className="mt-3 px-4 py-1.5 text-xs font-medium rounded-full border transition-colors"
              style={{
                borderColor: `${accentColor}44`,
                color: accentColor,
              }}
            >
              Edit Profile
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ 2. Quick Stats Grid ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Clock}
            value={totalListeningHours}
            suffix="h"
            label="Listening Time"
            accentColor={accentColor}
          />
          <StatCard
            icon={Music}
            value={stats.totalTracksPlayed}
            label="Songs Played"
            accentColor={accentColor}
          />
          <StatCard
            icon={Flame}
            value={streak}
            suffix="d"
            label="Streak"
            accentColor={accentColor}
          />
          <StatCard
            icon={Heart}
            value={likedSongs.length}
            label="Liked Songs"
            accentColor={accentColor}
          />
          <StatCard
            icon={ListMusic}
            value={playlists.length}
            label="Playlists"
            accentColor={accentColor}
          />
          <StatCard
            icon={Tag}
            value={0}
            label={`Top: ${topGenre}`}
            accentColor={accentColor}
          />
        </div>
      </motion.div>

      {/* ═══════════════ 3. Top Artists ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mb-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} style={{ color: accentColor }} />
          <h2 className="text-base font-bold text-white">Top Artists</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {(topArtists.length > 0 ? topArtists : favoriteArtists.slice(0, 5)).map(
            (artist, idx) => (
              <motion.div
                key={artist.channelId || artist.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.08 }}
                className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer"
                onClick={() =>
                  toast({
                    title: artist.name,
                    description: `${getArtistPlayCount(artist)} plays`,
                  })
                }
              >
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-full p-[2.5px]"
                    style={{
                      background:
                        idx === 0
                          ? `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`
                          : '#282828',
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-[#181818] overflow-hidden flex items-center justify-center">
                      {artist.thumbnail ? (
                        <img
                          src={artist.thumbnail}
                          alt={artist.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <UserIcon size={22} className="text-[#727272]" />
                      )}
                    </div>
                  </div>
                  {/* Rank overlay */}
                  <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: idx === 0 ? accentColor : '#282828' }}
                  >
                    {idx + 1}
                  </div>
                </div>
                <p className="text-[11px] text-white font-medium text-center max-w-[80px] truncate">
                  {artist.name}
                </p>
                <p className="text-[10px] text-[#727272]">
                  {getArtistPlayCount(artist)} plays
                </p>
              </motion.div>
            )
          )}
          {topArtists.length === 0 && favoriteArtists.length === 0 && (
            <div className="flex items-center justify-center w-full py-6">
              <p className="text-xs text-[#727272]">Start listening to see your top artists</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════ 4. Top Songs ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Music size={18} style={{ color: accentColor }} />
          <h2 className="text-base font-bold text-white">Top Songs</h2>
        </div>
        <div className="space-y-2">
          {topSongs.length > 0 ? (
            topSongs.slice(0, 5).map((track, idx) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#181818] cursor-pointer hover:bg-[#222222] transition-colors"
                style={idx === 0 ? { borderLeft: `3px solid ${accentColor}` } : undefined}
                onClick={() =>
                  toast({
                    title: track.title,
                    description: `${getSongPlayCount(track)} plays · ${track.artist}`,
                  })
                }
              >
                <span
                  className="text-sm font-bold w-6 text-center"
                  style={{ color: idx === 0 ? accentColor : '#727272' }}
                >
                  {idx + 1}
                </span>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#282828] flex-shrink-0">
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={18} className="text-[#727272]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{track.title}</p>
                  <p className="text-[11px] text-[#B3B3B3] truncate">{track.artist}</p>
                </div>
                <span className="text-[11px] text-[#727272] flex-shrink-0">
                  {getSongPlayCount(track)}x
                </span>
              </motion.div>
            ))
          ) : (
            <div className="flex items-center justify-center py-6 bg-[#181818] rounded-xl">
              <p className="text-xs text-[#727272]">Play some songs to see your top tracks</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════ 5. Listening Activity ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mb-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: accentColor }} />
            <h2 className="text-base font-bold text-white">Listening Activity</h2>
          </div>
          <span className="text-xs text-[#727272]">This Week</span>
        </div>
        <div className="bg-[#181818] rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#727272', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#727272', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#282828',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 12,
                }}
                labelStyle={{ color: '#B3B3B3' }}
                itemStyle={{ color: accentColor }}
              />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke={accentColor}
                strokeWidth={2}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ═══════════════ 6. Genre Distribution ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Tag size={18} style={{ color: accentColor }} />
          <h2 className="text-base font-bold text-white">Genre Distribution</h2>
        </div>
        <div className="bg-[#181818] rounded-2xl p-4">
          <div className="flex items-center gap-4">
            {/* Pie Chart */}
            <div className="w-28 h-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {genreData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={GENRE_COLORS[index % GENRE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Genre labels */}
            <div className="flex-1 space-y-2">
              {genreData.map((genre, idx) => (
                <div key={genre.name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: GENRE_COLORS[idx % GENRE_COLORS.length] }}
                  />
                  <span className="text-xs text-white flex-1">{genre.name}</span>
                  <span className="text-xs text-[#B3B3B3]">{genre.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ 7. Achievements Grid ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="mb-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: accentColor }} />
            <h2 className="text-base font-bold text-white">Achievements</h2>
          </div>
          <span className="text-xs text-[#727272]">
            {unlockedCount}/{achievements.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {achievements.map((achievement, idx) => {
            const isUnlocked = !!achievement.unlockedAt;
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAchievementTap(achievement)}
                className={`relative p-3.5 rounded-2xl cursor-pointer transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-[#181818] to-[#1a1a1a]'
                    : 'bg-[#181818]'
                }`}
                style={
                  isUnlocked
                    ? { border: `1px solid ${accentColor}33` }
                    : undefined
                }
              >
                {/* Overlay for locked */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-[#090909]/40 rounded-2xl flex items-center justify-center">
                    <Lock size={14} className="text-[#727272]" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xl ${!isUnlocked ? 'grayscale opacity-50' : ''}`}>
                    {achievement.icon}
                  </span>
                  {isUnlocked && (
                    <Check
                      size={12}
                      style={{ color: accentColor }}
                      className="flex-shrink-0"
                    />
                  )}
                </div>
                <p
                  className={`text-xs font-semibold mb-0.5 ${
                    isUnlocked ? 'text-white' : 'text-[#727272]'
                  }`}
                >
                  {achievement.title}
                </p>
                <p className="text-[10px] text-[#727272] leading-tight">
                  {achievement.description}
                </p>
                {/* Progress bar for incomplete */}
                {!isUnlocked && achievement.progress > 0 && (
                  <div className="mt-2 h-1 bg-[#282828] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${achievement.progress}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ═══════════════ 8. Theme Picker Section ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mb-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Palette size={18} style={{ color: accentColor }} />
          <h2 className="text-base font-bold text-white">Appearance</h2>
        </div>

        {/* Theme cards */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {themeEntries.map(([key, preset]) => {
            const isActive = selectedTheme === key;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTheme(key)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: '#181818',
                  border: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                }}
              >
                <div className="flex gap-0.5">
                  <div
                    className="w-4 h-4 rounded-full border border-white/10"
                    style={{ backgroundColor: preset.background }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/10"
                    style={{ backgroundColor: preset.cardBg }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/10"
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
                <span className="text-[10px] text-[#B3B3B3] text-center leading-tight">
                  {preset.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Accent color picker */}
        <div className="bg-[#181818] rounded-2xl p-4 mb-3">
          <p className="text-xs text-[#B3B3B3] mb-3">Accent Color</p>
          <div className="flex items-center gap-3">
            {ACCENT_COLORS.map(({ color, label }) => (
              <motion.button
                key={color}
                whileTap={{ scale: 0.85 }}
                onClick={() => setAccentColor(color)}
                className="relative w-8 h-8 rounded-full transition-transform"
                style={{ backgroundColor: color }}
                title={label}
              >
                {accentColor === color && (
                  <motion.div
                    layoutId="accent-check"
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Check size={14} className="text-white" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* AMOLED Toggle */}
        {selectedTheme !== 'light' && (
          <div className="bg-[#181818] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-[#B3B3B3]" />
              <div>
                <p className="text-sm text-white font-medium">AMOLED Black</p>
                <p className="text-[10px] text-[#727272]">True black for OLED screens</p>
              </div>
            </div>
            <button
              onClick={() => setAmoledMode(!amoledMode)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                amoledMode ? '' : 'bg-[#282828]'
              }`}
              style={amoledMode ? { backgroundColor: accentColor } : undefined}
            >
              <motion.div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full"
                animate={{ left: amoledMode ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        )}
      </motion.div>

      {/* ═══════════════ 9. API Key Management ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="mb-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Key size={18} style={{ color: accentColor }} />
          <h2 className="text-base font-bold text-white">API Configuration</h2>
        </div>
        <ApiKeyManager />
      </motion.div>

      {/* ═══════════════ 10. Settings Links ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mb-8"
      >
        <div className="space-y-1">
          {SETTINGS_LINKS.map((item, idx) => (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[#181818] hover:bg-[#222222] transition-colors"
              onClick={() =>
                toast({
                  title: item.label,
                  description: item.desc,
                })
              }
            >
              <item.icon size={18} className="text-[#727272]" />
              <div className="flex-1 text-left">
                <p className="text-sm text-white">{item.label}</p>
                <p className="text-[11px] text-[#727272]">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-[#727272]" />
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-6 pb-2">
          <p className="text-[10px] text-[#727272]">SAAVNIFY v1.0.4</p>
          <p className="text-[10px] text-[#727272]">Made with ❤️ for music lovers</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Genre keyword extraction (mirrors history-engine) ───────
function extractGenreKeywords(title: string, artist: string): string[] {
  const genreKeywords: Record<string, string[]> = {
    'lo-fi': ['lofi', 'lo-fi', 'lo fi', 'chillhop'],
    bollywood: ['bollywood', 'hindi', 'desi'],
    punjabi: ['punjabi', 'bhangra', 'pendu'],
    rock: ['rock', 'guitar', 'band'],
    pop: ['pop', 'hit', 'chart'],
    'hip-hop': ['rap', 'hip hop', 'hiphop', 'trap'],
    classical: ['classical', 'symphony', 'orchestra'],
    electronic: ['edm', 'electronic', 'techno', 'house', 'dj'],
    romantic: ['romantic', 'love', 'valentine', 'heart'],
    workout: ['workout', 'gym', 'exercise', 'pump'],
    study: ['study', 'focus', 'concentration', 'ambient'],
    devotional: ['devotional', 'bhajan', 'aarti', 'mantra'],
    jazz: ['jazz', 'blues', 'swing'],
    'r&b': ['r&b', 'rnb', 'soul'],
    country: ['country', 'folk'],
  };

  const text = `${title} ${artist}`.toLowerCase();
  const found: string[] = [];

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      found.push(genre);
    }
  }

  return found.length > 0 ? found : ['general'];
}
