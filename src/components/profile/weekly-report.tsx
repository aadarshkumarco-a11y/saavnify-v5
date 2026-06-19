'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Share2,
  Clock,
  Music2,
  Mic2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Headphones,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useUserStore } from '@/stores/user-store';
import { getWeeklyReport } from '@/lib/history-engine';
import type { WeeklyReport as WeeklyReportType } from '@/lib/history-engine';
import type { Track, Artist } from '@/types';

interface WeeklyReportProps {
  onClose: () => void;
}

const GENRE_COLORS = ['#1DB954', '#E13300', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316'];

function DiffIndicator({ value }: { value: number }) {
  if (value > 0) return <span className="flex items-center gap-0.5 text-[#1DB954] text-xs"><TrendingUp className="w-3 h-3" />+{value}</span>;
  if (value < 0) return <span className="flex items-center gap-0.5 text-[#E13300] text-xs"><TrendingDown className="w-3 h-3" />{value}</span>;
  return <span className="flex items-center gap-0.5 text-[#B3B3B3] text-xs"><Minus className="w-3 h-3" />0</span>;
}

const SAMPLE_REPORT: WeeklyReportType = {
  weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  totalMinutes: 342,
  totalPlays: 87,
  topTracks: [
    { id: '1', videoId: 'v1', title: 'Blinding Lights', artist: 'The Weeknd', thumbnail: '', duration: 200, channelTitle: 'The Weeknd', addedAt: Date.now() },
    { id: '2', videoId: 'v2', title: 'Levitating', artist: 'Dua Lipa', thumbnail: '', duration: 203, channelTitle: 'Dua Lipa', addedAt: Date.now() },
    { id: '3', videoId: 'v3', title: 'Stay', artist: 'The Kid LAROI', thumbnail: '', duration: 141, channelTitle: 'The Kid LAROI', addedAt: Date.now() },
  ],
  topArtists: [
    { id: 'a1', channelId: 'c1', name: 'The Weeknd', thumbnail: '' },
    { id: 'a2', channelId: 'c2', name: 'Dua Lipa', thumbnail: '' },
    { id: 'a3', channelId: 'c3', name: 'Ed Sheeran', thumbnail: '' },
  ],
  topGenres: ['Pop', 'Rock', 'Electronic'],
  dailyBreakdown: [
    { date: 'Mon', minutes: 45 },
    { date: 'Tue', minutes: 62 },
    { date: 'Wed', minutes: 38 },
    { date: 'Thu', minutes: 55 },
    { date: 'Fri', minutes: 78 },
    { date: 'Sat', minutes: 42 },
    { date: 'Sun', minutes: 22 },
  ],
  averageDailyMinutes: 49,
};

const PREV_WEEK_SAMPLE = {
  totalMinutes: 298,
  totalPlays: 72,
};

export function WeeklyReportView({ onClose }: WeeklyReportProps) {
  const { profile, stats } = useUserStore();
  const [report, setReport] = useState<WeeklyReportType>(SAMPLE_REPORT);
  const [prevWeekMinutes] = useState(PREV_WEEK_SAMPLE.totalMinutes);
  const [prevWeekPlays] = useState(PREV_WEEK_SAMPLE.totalPlays);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const weeklyReport = await getWeeklyReport();
        if (weeklyReport.totalMinutes > 0 || weeklyReport.totalPlays > 0) {
          setReport(weeklyReport);
        }
      } catch {
        // Use sample data
      }
    }
    loadData();
  }, [stats.weeklyListeningTime]);

  const minutesDiff = report.totalMinutes - prevWeekMinutes;
  const playsDiff = report.totalPlays - prevWeekPlays;

  const genrePieData = report.topGenres.map((genre, i) => ({
    name: genre.charAt(0).toUpperCase() + genre.slice(1),
    value: Math.max(1, report.totalPlays - i * Math.floor(report.totalPlays / (report.topGenres.length + 1))),
  }));

  const dailyData = report.dailyBreakdown.length > 0
    ? report.dailyBreakdown.map(d => ({
        day: d.date.length > 3 ? d.date.slice(5) : d.date,
        minutes: d.minutes,
      }))
    : SAMPLE_REPORT.dailyBreakdown.map(d => ({ day: d.date, minutes: d.minutes }));

  const weekEnd = new Date(report.weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  function formatDateRange() {
    const start = new Date(report.weekStart);
    const end = new Date(weekEnd);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  const dateRange = formatDateRange();

  const handleShare = useCallback(async () => {
    const shareText = `🎵 My SAAVNIFY Weekly Report\n\n📅 ${dateRange}\n⏱ ${report.totalMinutes} min listened\n🎶 ${report.totalPlays} songs\n🎤 Top: ${report.topArtists[0]?.name || 'Unknown'}\n🎵 Fav: ${report.topTracks[0]?.title || 'Unknown'}\n\n#SAAVNIFYWeekly`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'SAAVNIFY Weekly Report', text: shareText });
        return;
      } catch {
        // fallback
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  }, [report, dateRange]);

  return (
    <div className="fixed inset-0 z-50 bg-[#090909] overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-[#090909] to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-[#181818]/80 flex items-center justify-center backdrop-blur-sm"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-white font-bold text-sm">Weekly Report</h2>
        <button
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-[#181818]/80 flex items-center justify-center backdrop-blur-sm"
        >
          <Share2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto pt-16 pb-8 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Cover Slide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1DB954]/20 via-[#181818] to-[#181818] rounded-3xl p-6 mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-[#1DB954]" />
            <span className="text-[#1DB954] text-xs font-medium">{formatDateRange()}</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Your Weekly</h1>
          <h1 className="text-2xl font-black text-[#1DB954] mb-3">Listening Report</h1>
          <p className="text-[#B3B3B3] text-xs">{profile.name}&apos;s music journey this week</p>
        </motion.div>

        {/* Key Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <div className="bg-[#181818] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-4 h-4 text-[#1DB954]" />
              <DiffIndicator value={minutesDiff} />
            </div>
            <p className="text-2xl font-black text-white">{report.totalMinutes}</p>
            <p className="text-[#B3B3B3] text-xs">minutes listened</p>
          </div>
          <div className="bg-[#181818] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Music2 className="w-4 h-4 text-[#1DB954]" />
              <DiffIndicator value={playsDiff} />
            </div>
            <p className="text-2xl font-black text-white">{report.totalPlays}</p>
            <p className="text-[#B3B3B3] text-xs">songs played</p>
          </div>
        </motion.div>

        {/* Top Song */}
        {report.topTracks[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#181818] rounded-2xl p-4 mb-4"
          >
            <p className="text-[#B3B3B3] text-xs mb-3">Top Song This Week</p>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-[#282828] overflow-hidden flex-shrink-0">
                {report.topTracks[0].thumbnail ? (
                  <img src={report.topTracks[0].thumbnail} alt={report.topTracks[0].title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1DB954]/30 to-[#282828]">
                    <Headphones className="w-6 h-6 text-[#1DB954]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{report.topTracks[0].title}</p>
                <p className="text-[#B3B3B3] text-xs truncate">{report.topTracks[0].artist}</p>
              </div>
              <div className="bg-[#1DB954]/10 rounded-full px-3 py-1">
                <span className="text-[#1DB954] text-xs font-bold">#1</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Artist */}
        {report.topArtists[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#181818] rounded-2xl p-4 mb-4"
          >
            <p className="text-[#B3B3B3] text-xs mb-3">Top Artist This Week</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#282828] overflow-hidden flex-shrink-0">
                {report.topArtists[0].thumbnail ? (
                  <img src={report.topArtists[0].thumbnail} alt={report.topArtists[0].name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#8B5CF6]/30 to-[#282828]">
                    <Mic2 className="w-5 h-5 text-[#8B5CF6]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{report.topArtists[0].name}</p>
                <p className="text-[#B3B3B3] text-xs">Your most played</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Daily Listening Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#181818] rounded-2xl p-4 mb-4"
        >
          <p className="text-[#B3B3B3] text-xs mb-4">Daily Listening</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#B3B3B3', fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#282828',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  cursor={{ fill: 'rgba(29, 185, 84, 0.1)' }}
                />
                <Bar
                  dataKey="minutes"
                  fill="#1DB954"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[#B3B3B3] text-xs">Avg: {report.averageDailyMinutes} min/day</span>
          </div>
        </motion.div>

        {/* Genre Breakdown */}
        {genrePieData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#181818] rounded-2xl p-4 mb-4"
          >
            <p className="text-[#B3B3B3] text-xs mb-4">Genre Breakdown</p>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genrePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {genrePieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={GENRE_COLORS[index % GENRE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {genrePieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }}
                    />
                    <span className="text-white text-xs flex-1 truncate">{item.name}</span>
                    <span className="text-[#B3B3B3] text-[10px]">{Math.round((item.value / genrePieData.reduce((s, d) => s + d.value, 0)) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Tracks List */}
        {report.topTracks.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#181818] rounded-2xl p-4 mb-4"
          >
            <p className="text-[#B3B3B3] text-xs mb-3">Other Top Tracks</p>
            <div className="space-y-2">
              {report.topTracks.slice(1, 5).map((track, i) => (
                <div key={track.id} className="flex items-center gap-3">
                  <span className="text-[#B3B3B3] text-xs font-bold w-4 text-center">{i + 2}</span>
                  <div className="w-8 h-8 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                    {track.thumbnail ? (
                      <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-3 h-3 text-[#727272]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{track.title}</p>
                    <p className="text-[#727272] text-[10px] truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Share Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1DB954] rounded-full text-white font-bold text-sm mb-4"
        >
          <Share2 className="w-4 h-4" />
          Share Report
        </motion.button>

        {/* Share toast */}
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#181818] border border-[#1DB954]/30 rounded-full px-4 py-2 text-white text-sm shadow-lg z-50"
          >
            Copied to clipboard!
          </motion.div>
        )}
      </div>
    </div>
  );
}
