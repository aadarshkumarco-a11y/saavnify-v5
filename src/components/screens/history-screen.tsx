"use client";

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  History as HistoryIcon,
  Trash2,
  Play,
  Clock,
  Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { toast } from 'sonner';
import type { HistoryEntry, Track } from '@/types';

// ---- Helpers ----

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isYesterday(ts: number): boolean {
  const today = startOfDay(Date.now());
  const yesterday = today - 24 * 60 * 60 * 1000;
  return startOfDay(ts) === yesterday;
}

function isToday(ts: number): boolean {
  return startOfDay(ts) === startOfDay(Date.now());
}

function isThisWeek(ts: number): boolean {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return ts >= weekAgo;
}

function groupByDate(entries: HistoryEntry[]): {
  label: string;
  items: HistoryEntry[];
}[] {
  const today: HistoryEntry[] = [];
  const yesterday: HistoryEntry[] = [];
  const thisWeek: HistoryEntry[] = [];
  const older: HistoryEntry[] = [];

  for (const e of entries) {
    if (isToday(e.playedAt)) today.push(e);
    else if (isYesterday(e.playedAt)) yesterday.push(e);
    else if (isThisWeek(e.playedAt)) thisWeek.push(e);
    else older.push(e);
  }

  const groups: { label: string; items: HistoryEntry[] }[] = [];
  if (today.length) groups.push({ label: 'Today', items: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
  if (thisWeek.length) groups.push({ label: 'This Week', items: thisWeek });
  if (older.length) groups.push({ label: 'Older', items: older });
  return groups;
}

// ---- Image with Fallback ----

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
        <Music size={18} className="text-[#1DB954]/60" />
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

// ---- Main Component ----

export function HistoryScreen() {
  const history = useLibraryStore((s) => s.history);
  const clearHistory = useLibraryStore((s) => s.clearHistory);
  const playQueue = usePlayerStore((s) => s.playQueue);

  // Derive "recently played" - deduped by trackId, latest playedAt first
  const recentlyPlayed = useMemo(() => {
    const seen = new Set<string>();
    const out: HistoryEntry[] = [];
    for (const e of history) {
      if (seen.has(e.track.id)) continue;
      seen.add(e.track.id);
      out.push(e);
    }
    return out;
  }, [history]);

  const grouped = useMemo(() => groupByDate(history), [history]);

  const handlePlay = (entry: HistoryEntry, groupItems: HistoryEntry[]) => {
    const tracks: Track[] = groupItems.map((g) => g.track);
    const idx = groupItems.findIndex((g) => g.songId === entry.songId);
    playQueue(tracks, Math.max(0, idx), 'history');
    toast.success('Playing from history', {
      description: entry.track.title,
    });
  };

  const handleClear = () => {
    clearHistory();
    toast.success('History cleared');
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
              <HistoryIcon size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                History
              </h1>
              <p className="text-xs text-[#B3B3B3]">
                {history.length} {history.length === 1 ? 'play' : 'plays'} ·{' '}
                {recentlyPlayed.length} unique tracks
              </p>
            </div>
          </div>

          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-transparent border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={14} className="mr-1.5" /> Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#181818] border-[#282828] text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#B3B3B3]">
                    This will remove all {history.length} entries from your
                    listening history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClear}
                    className="bg-red-600 hover:bg-red-700 text-white border-0"
                  >
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </motion.div>

        {history.length === 0 ? (
          <div className="bg-[#181818] rounded-2xl py-20 text-center">
            <Clock size={44} className="mx-auto text-[#1DB954]/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No history yet</h3>
            <p className="text-sm text-[#B3B3B3] max-w-xs mx-auto">
              Tracks you play will appear here so you can jump back to them
              anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group, gIdx) => (
              <motion.section
                key={group.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: gIdx * 0.05 }}
                aria-label={group.label}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-base font-semibold">{group.label}</h2>
                  <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
                    {group.items.length}
                  </Badge>
                </div>
                <div className="bg-[#181818] rounded-2xl overflow-hidden">
                  {group.items.map((entry, idx) => (
                    <div
                      key={`${entry.songId}-${entry.playedAt}-${idx}`}
                      className="flex items-center gap-3 p-2.5 hover:bg-[#222222] transition-colors group border-b border-[#222222] last:border-0"
                    >
                      <button
                        onClick={() => handlePlay(entry, group.items)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                        aria-label={`Play ${entry.track.title}`}
                      >
                        <TrackImage
                          src={entry.track.thumbnail}
                          alt={entry.track.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play size={16} fill="white" className="text-white" />
                        </div>
                      </button>
                      <button
                        onClick={() => handlePlay(entry, group.items)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium text-white truncate">
                          {truncate(entry.track.title, 36)}
                        </p>
                        <p className="text-xs text-[#B3B3B3] truncate">
                          {truncate(entry.track.artist, 28)}
                        </p>
                      </button>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-[#B3B3B3]">
                          {timeAgo(entry.playedAt)}
                        </p>
                        {entry.playDuration > 0 && (
                          <p className="text-[10px] text-[#727272] mt-0.5">
                            played {Math.round(entry.playDuration)}s
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
