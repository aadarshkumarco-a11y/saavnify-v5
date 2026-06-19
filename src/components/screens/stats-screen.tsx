"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  Award,
  Clock,
  Crown,
  Disc3,
  Headphones,
  Heart,
  Music,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUserStore } from '@/stores/user-store';
import { useLibraryStore } from '@/stores/library-store';
import type { Track, HistoryEntry, Achievement } from '@/types';

// ---- Helpers ----

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

// ---- Track Image ----

function TrackImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

// ---- KPI Card ----

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  delay,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="bg-[#181818] border-[#282828] p-4 h-full">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
          >
            <Icon size={18} className="text-white" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-[#B3B3B3] mt-1">{label}</p>
        {sub && <p className="text-[10px] text-[#727272] mt-0.5">{sub}</p>}
      </Card>
    </motion.div>
  );
}

// ---- Chart Tooltip ----

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#222222] border border-[#282828] rounded-xl px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-[#B3B3B3] mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: p.color || p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ---- Achievements Section ----

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const unlocked = !!achievement.unlockedAt;
  return (
    <Card
      className={`bg-[#181818] border-[#282828] p-3 ${
        unlocked ? 'ring-1 ring-[#1DB954]/40' : 'opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
            unlocked
              ? 'bg-gradient-to-br from-[#1DB954] to-emerald-700'
              : 'bg-[#222222]'
          }`}
        >
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">
              {achievement.title}
            </p>
            {unlocked && (
              <Award size={12} className="text-[#1DB954] flex-shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-[#B3B3B3] truncate">
            {achievement.description}
          </p>
          {!unlocked && (
            <Progress
              value={achievement.progress}
              className="h-1 mt-1.5 bg-[#222222]"
            />
          )}
        </div>
      </div>
    </Card>
  );
}

// ---- Main Component ----

export function StatsScreen() {
  const stats = useUserStore((s) => s.stats);
  const achievements = useUserStore((s) => s.achievements);
  const history = useLibraryStore((s) => s.history);
  const likedSongs = useLibraryStore((s) => s.likedSongs);

  // Most played tracks derived from history
  const mostPlayed = useMemo(() => {
    const counts = new Map<string, { track: Track; count: number }>();
    for (const entry of history as HistoryEntry[]) {
      const existing = counts.get(entry.track.id);
      if (existing) existing.count += 1;
      else counts.set(entry.track.id, { track: entry.track, count: 1 });
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [history]);

  // Top artists derived from history (by play count)
  const topArtistsData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of history as HistoryEntry[]) {
      const name = entry.track.artist || 'Unknown';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name: truncate(name, 14), plays: count }));
  }, [history]);

  // Unique artists count
  const uniqueArtists = useMemo(() => {
    const set = new Set<string>();
    for (const e of history as HistoryEntry[]) {
      if (e.track.artist) set.add(e.track.artist);
    }
    return set.size;
  }, [history]);

  // Weekly listening - mock from stats if empty
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const base = Math.max(stats.weeklyListeningTime / 7, 8);
    return days.map((d, i) => ({
      day: d,
      minutes: Math.round(base * (0.6 + ((i * 1.3) % 7) / 7) + (i % 3 === 0 ? 5 : 0)),
    }));
  }, [stats.weeklyListeningTime]);

  // Genre distribution mock (from favoriteGenres or default)
  const genreData = useMemo(() => {
    const genres =
      stats.topGenres.length > 0
        ? stats.topGenres
        : ['Pop', 'Hip-Hop', 'Romantic', 'Lo-Fi', 'Rock'];
    const colors = ['#1DB954', '#f97316', '#ec4899', '#06b6d4', '#a855f7'];
    return genres.slice(0, 5).map((g, i) => ({
      name: g,
      value: 20 + ((i * 17) % 30),
      color: colors[i % colors.length],
    }));
  }, [stats.topGenres]);

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalMinutes = stats.totalListeningTime || 0;

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
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Insights
              </h1>
              <p className="text-xs text-[#B3B3B3]">
                Your listening habits at a glance
              </p>
            </div>
          </div>
          <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
            <Crown size={12} className="mr-1" /> {unlockedCount}/{achievements.length}
          </Badge>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <KpiCard
            icon={Clock}
            label="Listening Time"
            value={formatMinutes(totalMinutes)}
            sub="Total time spent"
            gradient="from-[#1DB954] to-emerald-700"
            delay={0}
          />
          <KpiCard
            icon={Music}
            label="Tracks Played"
            value={stats.totalTracksPlayed || history.length}
            sub="Lifetime plays"
            gradient="from-orange-500 to-amber-600"
            delay={0.05}
          />
          <KpiCard
            icon={Users}
            label="Unique Artists"
            value={uniqueArtists}
            sub="From your history"
            gradient="from-pink-500 to-rose-600"
            delay={0.1}
          />
          <KpiCard
            icon={Heart}
            label="Likes"
            value={likedSongs.length}
            sub="Loved tracks"
            gradient="from-fuchsia-500 to-purple-600"
            delay={0.15}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Listening Over 7 Days (Area Chart) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-[#181818] border-[#282828] p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#1DB954]" />
                  <h2 className="text-base font-semibold">
                    Listening (last 7 days)
                  </h2>
                </div>
                <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
                  {formatMinutes(weeklyData.reduce((s, d) => s + d.minutes, 0))}
                </Badge>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={weeklyData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1DB954" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#1DB954" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#222222"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="#727272"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#727272"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      name="Minutes"
                      stroke="#1DB954"
                      strokeWidth={2}
                      fill="url(#grad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Top Genres (Pie Chart) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card className="bg-[#181818] border-[#282828] p-4 sm:p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Disc3 size={16} className="text-[#1DB954]" />
                <h2 className="text-base font-semibold">Top Genres</h2>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genreData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {genreData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {genreData.map((g) => (
                  <div
                    key={g.name}
                    className="flex items-center gap-1.5 text-[11px] text-[#B3B3B3]"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                    {g.name}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Top Artists Bar Chart */}
        {topArtistsData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-8"
          >
            <Card className="bg-[#181818] border-[#282828] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Crown size={16} className="text-[#1DB954]" />
                <h2 className="text-base font-semibold">Top 5 Artists</h2>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topArtistsData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#222222"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#727272"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#727272"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: '#22222250' }}
                    />
                    <Bar
                      dataKey="plays"
                      name="Plays"
                      fill="#1DB954"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Top Tracks List */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mb-8"
          aria-label="Top Tracks"
        >
          <div className="flex items-center gap-2 mb-3">
            <Headphones size={16} className="text-[#1DB954]" />
            <h2 className="text-base font-semibold">Your Top Tracks</h2>
          </div>
          {mostPlayed.length === 0 ? (
            <div className="bg-[#181818] rounded-2xl py-12 text-center">
              <Music size={36} className="mx-auto text-[#1DB954]/40 mb-3" />
              <p className="text-sm text-[#B3B3B3]">
                Play some music to see your top tracks here.
              </p>
            </div>
          ) : (
            <Card className="bg-[#181818] border-[#282828] overflow-hidden">
              {mostPlayed.map((item, idx) => (
                <div
                  key={item.track.id}
                  className="flex items-center gap-3 p-2.5 border-b border-[#222222] last:border-0"
                >
                  <div className="w-7 text-center text-sm font-bold text-[#1DB954]">
                    {idx + 1}
                  </div>
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#222222]">
                    <TrackImage
                      src={item.track.thumbnail}
                      alt={item.track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {truncate(item.track.title, 32)}
                    </p>
                    <p className="text-xs text-[#B3B3B3] truncate">
                      {truncate(item.track.artist, 24)}
                    </p>
                  </div>
                  <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
                    {item.count}x
                  </Badge>
                </div>
              ))}
            </Card>
          )}
        </motion.section>

        {/* Achievements */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          aria-label="Achievements"
        >
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-[#1DB954]" />
            <h2 className="text-base font-semibold">Achievements</h2>
            <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
              {unlockedCount} unlocked
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
