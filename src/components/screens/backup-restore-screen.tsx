"use client";

import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Download as DownloadIcon,
  Upload,
  Database,
  HardDrive,
  Trash2,
  FileJson,
  Check,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { useUserStore } from '@/stores/user-store';
import { toast } from 'sonner';
import type { Track, Playlist, HistoryEntry } from '@/types';

// ---- Helpers ----

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---- Backup Data Shape ----

interface BackupData {
  app: string;
  version: string;
  exportedAt: number;
  likedSongs: Track[];
  playlists: Playlist[];
  playlistTracks: Record<string, Track[]>;
  history: HistoryEntry[];
}

// ---- Preview Card ----

function PreviewRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[#B3B3B3]">{label}</span>
      <span
        className={`text-sm font-semibold ${accent ? 'text-[#1DB954]' : 'text-white'}`}
      >
        {value}
      </span>
    </div>
  );
}

// ---- Main Component ----

export function BackupRestoreScreen() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BackupData | null>(null);
  const [previewSize, setPreviewSize] = useState(0);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Subscribed slices
  const likedSongs = useLibraryStore((s) => s.likedSongs);
  const playlists = useLibraryStore((s) => s.playlists);
  const playlistTracks = useLibraryStore((s) => s.playlistTracks);
  const history = useLibraryStore((s) => s.history);

  // Estimate current storage size
  const currentSize = useMemo(() => {
    const snapshot: BackupData = {
      app: 'Saavnify v5',
      version: '1.0.0',
      exportedAt: Date.now(),
      likedSongs,
      playlists,
      playlistTracks,
      history,
    };
    try {
      return new Blob([JSON.stringify(snapshot)]).size;
    } catch {
      return 0;
    }
  }, [likedSongs, playlists, playlistTracks, history]);

  const handleExport = () => {
    try {
      const data: BackupData = {
        app: 'Saavnify v5',
        version: '1.0.0',
        exportedAt: Date.now(),
        likedSongs,
        playlists,
        playlistTracks,
        history,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saavnify-backup-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Library exported', {
        description: `saavnify-backup-${todayStamp()}.json`,
      });
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed', {
        description: 'Could not generate backup file.',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result || '');
        const parsed = JSON.parse(text) as BackupData;
        if (!parsed || !parsed.app || !Array.isArray(parsed.likedSongs)) {
          throw new Error('Invalid backup file format');
        }
        setPreview(parsed);
        setPreviewSize(file.size);
        toast.success('Backup loaded', {
          description: 'Review the preview, then restore.',
        });
      } catch (err) {
        console.error('Invalid backup:', err);
        toast.error('Invalid backup file', {
          description: 'Could not parse this JSON file.',
        });
        setPreview(null);
      }
    };
    reader.onerror = () => toast.error('Could not read file');
    reader.readAsText(file);
    // Reset input so the same file can be selected again later
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestore = () => {
    if (!preview) return;
    try {
      const state = useLibraryStore.getState();
      // Merge liked songs (avoid duplicates by id)
      const mergedLiked = [
        ...preview.likedSongs,
        ...state.likedSongs.filter(
          (existing) => !preview.likedSongs.some((t) => t.id === existing.id)
        ),
      ];
      // Merge playlists (avoid duplicates by id)
      const existingPlaylistIds = new Set(state.playlists.map((p) => p.id));
      const newPlaylists = preview.playlists.filter(
        (p) => !existingPlaylistIds.has(p.id)
      );
      const mergedPlaylists = [...state.playlists, ...newPlaylists];
      // Merge playlist tracks (sum by id)
      const mergedPlaylistTracks = { ...state.playlistTracks };
      for (const [pid, tracks] of Object.entries(preview.playlistTracks || {})) {
        const existing = mergedPlaylistTracks[pid] || [];
        const existingIds = new Set(existing.map((t) => t.id));
        const toAdd = tracks.filter((t) => !existingIds.has(t.id));
        mergedPlaylistTracks[pid] = [...existing, ...toAdd];
      }
      // Merge history (dedupe by songId+playedAt)
      const existingHistoryKeys = new Set(
        state.history.map((h) => `${h.songId}-${h.playedAt}`)
      );
      const newHistory = preview.history.filter(
        (h) => !existingHistoryKeys.has(`${h.songId}-${h.playedAt}`)
      );
      const mergedHistory = [...state.history, ...newHistory]
        .sort((a, b) => b.playedAt - a.playedAt)
        .slice(0, 500);

      useLibraryStore.setState({
        likedSongs: mergedLiked,
        playlists: mergedPlaylists,
        playlistTracks: mergedPlaylistTracks,
        history: mergedHistory,
      });
      toast.success('Library restored', {
        description: `Added ${preview.likedSongs.length} liked, ${preview.playlists.length} playlists, ${preview.history.length} history.`,
      });
      setPreview(null);
      setShowRestoreDialog(false);
    } catch (err) {
      console.error('Restore failed:', err);
      toast.error('Restore failed');
    }
  };

  const handleClearAll = () => {
    try {
      useLibraryStore.setState({
        likedSongs: [],
        playlists: [],
        playlistTracks: {},
        history: [],
        pinnedPlaylists: [],
        searchHistory: [],
      });
      useUserStore.setState((s) => ({
        ...s,
        favoriteArtists: [],
        favoriteGenres: [],
        stats: {
          ...s.stats,
          totalListeningTime: 0,
          totalTracksPlayed: 0,
          weeklyListeningTime: 0,
        },
      }));
      toast.success('All data cleared');
    } catch (err) {
      console.error('Clear failed:', err);
      toast.error('Could not clear data');
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
            <Database size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Backup & Restore
            </h1>
            <p className="text-xs text-[#B3B3B3]">
              Export, import, or wipe your library data
            </p>
          </div>
        </motion.div>

        {/* Storage Usage */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6"
        >
          <Card className="bg-[#181818] border-[#282828] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-[#1DB954]" />
                <span className="text-sm font-medium">Estimated Storage</span>
              </div>
              <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
                {formatBytes(currentSize)}
              </Badge>
            </div>
            <Separator className="my-3 bg-[#222222]" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#727272]">
                  Liked
                </p>
                <p className="text-base font-semibold">{likedSongs.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#727272]">
                  Playlists
                </p>
                <p className="text-base font-semibold">{playlists.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#727272]">
                  History
                </p>
                <p className="text-base font-semibold">{history.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#727272]">
                  Tracks in playlists
                </p>
                <p className="text-base font-semibold">
                  {Object.values(playlistTracks).reduce(
                    (s, arr) => s + arr.length,
                    0
                  )}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Export Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-4"
        >
          <Card className="bg-[#181818] border-[#282828] p-4">
            <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
              <div className="w-12 h-12 rounded-2xl bg-[#1DB954]/10 flex items-center justify-center flex-shrink-0">
                <DownloadIcon size={22} className="text-[#1DB954]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">Export Library</h3>
                <p className="text-xs text-[#B3B3B3] mt-1">
                  Download a JSON file containing your liked songs, playlists,
                  playlist tracks, and listening history. Save it somewhere safe
                  for later restore.
                </p>
              </div>
              <Button
                onClick={handleExport}
                disabled={currentSize === 0}
                className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-full"
              >
                <DownloadIcon size={16} className="mr-2" /> Export
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Import Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-4"
        >
          <Card className="bg-[#181818] border-[#282828] p-4">
            <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Upload size={22} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">Import Library</h3>
                <p className="text-xs text-[#B3B3B3] mt-1">
                  Select a previously-exported JSON backup. We&apos;ll preview
                  what will be added before merging it into your current
                  library.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
                id="backup-file-input"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
              >
                <FileJson size={16} className="mr-2" /> Choose File
              </Button>
            </div>

            {/* Preview */}
            {preview && (
              <div className="mt-4 bg-[#222222] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                    Backup Preview
                  </span>
                  <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
                    {formatBytes(previewSize)}
                  </Badge>
                </div>
                <PreviewRow
                  label="App"
                  value={`${preview.app} v${preview.version}`}
                />
                <PreviewRow
                  label="Exported"
                  value={new Date(preview.exportedAt).toLocaleString()}
                />
                <Separator className="my-2 bg-[#282828]" />
                <PreviewRow
                  label="Liked songs"
                  value={preview.likedSongs.length}
                  accent
                />
                <PreviewRow
                  label="Playlists"
                  value={preview.playlists.length}
                  accent
                />
                <PreviewRow
                  label="Tracks in playlists"
                  value={Object.values(preview.playlistTracks || {}).reduce(
                    (s, arr) => s + arr.length,
                    0
                  )}
                  accent
                />
                <PreviewRow
                  label="History entries"
                  value={preview.history.length}
                  accent
                />
                <div className="flex gap-2 mt-4">
                  <AlertDialog
                    open={showRestoreDialog}
                    onOpenChange={setShowRestoreDialog}
                  >
                    <AlertDialogTrigger asChild>
                      <Button className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-full flex-1">
                        <Check size={16} className="mr-2" /> Restore Backup
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#181818] border-[#282828] text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#B3B3B3]">
                          This will merge the backup into your current library.
                          Existing items will be preserved; duplicates will be
                          skipped. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleRestore}
                          className="bg-[#1DB954] hover:bg-[#1ed760] text-black border-0"
                        >
                          Restore
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    variant="outline"
                    onClick={() => setPreview(null)}
                    className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="bg-[#181818] border-red-500/30 p-4">
            <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-red-300">
                  Clear All Data
                </h3>
                <p className="text-xs text-[#B3B3B3] mt-1">
                  Permanently delete all liked songs, playlists, history, and
                  listening stats from this device. Make sure to export a backup
                  first if you want to keep your data.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-full bg-transparent border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 size={16} className="mr-2" /> Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#181818] border-[#282828] text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Clear all data permanently?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#B3B3B3]">
                      This will wipe your library, history, and stats. This
                      action cannot be undone. Consider exporting a backup
                      first.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                      Yes, clear everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        </motion.div>

        {/* Privacy Note */}
        <div className="mt-6 bg-[#181818] border border-[#282828] rounded-2xl p-4 flex items-start gap-3">
          <Shield size={16} className="text-[#1DB954] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#B3B3B3]">
            Your data is stored locally in your browser. Backups contain only
            what is shown above — no account credentials or authentication
            tokens are ever included.
          </p>
        </div>
      </div>
    </div>
  );
}
