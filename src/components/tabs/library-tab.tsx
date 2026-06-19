'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Plus,
  Music2,
  Clock,
  ListMusic,
  Play,
  Shuffle,
  Trash2,
  Pin,
  PinOff,
  ChevronRight,
  ArrowUpDown,
  Sparkles,
  User,
  Disc3,
  Pencil,
  Copy,
  Share2,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';
import { useUserStore } from '@/stores/user-store';
import { formatDuration } from '@/lib/youtube-api';
import { CreatePlaylistDialog } from '@/components/library/create-playlist-dialog';
import { PlaylistDetailView } from '@/components/library/playlist-detail-view';
import type { Track, Playlist } from '@/types';

// ---- Types ----

type FilterType =
  | 'all'
  | 'playlists'
  | 'liked'
  | 'artists'
  | 'albums'
  | 'history'
  | 'pinned';

type SortType = 'recent' | 'name' | 'custom';

interface FilterChip {
  id: FilterType;
  label: string;
  icon: React.ReactNode;
}

// ---- Helper: Format time ago ----

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ---- Helper: Get date group ----

function getDateGroup(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This Week';
  return 'Earlier';
}

// ---- Filter Chips Data ----

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All', icon: null },
  { id: 'playlists', label: 'Playlists', icon: <ListMusic size={14} /> },
  { id: 'liked', label: 'Liked Songs', icon: <Heart size={14} /> },
  { id: 'artists', label: 'Artists', icon: <User size={14} /> },
  { id: 'albums', label: 'Albums', icon: <Disc3 size={14} /> },
  { id: 'history', label: 'History', icon: <Clock size={14} /> },
  { id: 'pinned', label: 'Pinned', icon: <Pin size={14} /> },
];

// ---- Empty State Component ----

function EmptyState({
  icon,
  title,
  subtitle,
  action,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-24 h-24 rounded-full bg-[#181818] flex items-center justify-center mb-5"
      >
        {icon}
      </motion.div>
      <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
      <p className="text-[#727272] text-sm text-center max-w-[260px] mb-4">
        {subtitle}
      </p>
      {action && actionLabel && (
        <motion.button
          onClick={action}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2.5 bg-[#1DB954] text-[#090909] text-sm font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

// ---- Playlist Card Component ----

function PlaylistCard({
  playlist,
  isPinned,
  onTap,
  onPin,
  onDelete,
  onRename,
  onDuplicate,
}: {
  playlist: Playlist;
  isPinned: boolean;
  onTap: () => void;
  onPin: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDuplicate: () => void;
}) {
  const gradients = [
    'from-[#1DB954]/40 to-[#181818]',
    'from-[#E91429]/30 to-[#181818]',
    'from-[#8B5CF6]/30 to-[#181818]',
    'from-[#F59E0B]/30 to-[#181818]',
    'from-[#EC4899]/30 to-[#181818]',
    'from-[#06B6D4]/30 to-[#181818]',
  ];
  const gradientIndex = playlist.name.length % gradients.length;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <motion.button
          onClick={onTap}
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -2 }}
          className="w-full text-left bg-[#181818] rounded-2xl p-3 hover:bg-[#222222] transition-colors group relative overflow-hidden"
        >
          {/* Artwork */}
          <div
            className={`w-full aspect-square rounded-xl bg-gradient-to-br ${gradients[gradientIndex]} flex items-center justify-center mb-3 relative overflow-hidden`}
          >
            {playlist.isSmart ? (
              <div className="relative">
                <Sparkles size={36} className="text-[#1DB954]" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute inset-0"
                >
                  <Sparkles size={36} className="text-[#1DB954]/20" />
                </motion.div>
              </div>
            ) : (
              <ListMusic size={36} className="text-white/60" />
            )}

            {/* Pinned Badge */}
            {isPinned && (
              <div className="absolute top-2 right-2">
                <div className="bg-black/60 backdrop-blur-sm rounded-full p-1">
                  <Pin size={10} className="text-[#1DB954]" />
                </div>
              </div>
            )}

            {/* Smart Badge */}
            {playlist.isSmart && (
              <div className="absolute bottom-2 left-2">
                <div className="bg-[#1DB954]/20 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Sparkles size={8} className="text-[#1DB954]" />
                  <span className="text-[8px] text-[#1DB954] font-medium">Smart</span>
                </div>
              </div>
            )}

            {/* Play Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                <Play size={18} fill="#090909" className="text-[#090909] ml-0.5" />
              </div>
            </motion.div>
          </div>

          {/* Info */}
          <p className="text-sm font-medium text-white truncate mb-0.5">
            {playlist.name}
          </p>
          <p className="text-xs text-[#B3B3B3]">
            {playlist.trackCount} {playlist.trackCount === 1 ? 'song' : 'songs'}
            {playlist.isSmart && (
              <span className="text-[#1DB954]"> • Auto-generated</span>
            )}
          </p>
        </motion.button>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-[#282828] border-[#3a3a3a]">
        <ContextMenuItem
          onClick={onRename}
          className="text-white focus:bg-[#3a3a3a] focus:text-white"
        >
          <Pencil size={14} className="mr-2 text-[#B3B3B3]" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDuplicate}
          className="text-white focus:bg-[#3a3a3a] focus:text-white"
        >
          <Copy size={14} className="mr-2 text-[#B3B3B3]" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onPin}
          className="text-white focus:bg-[#3a3a3a] focus:text-white"
        >
          {isPinned ? (
            <PinOff size={14} className="mr-2 text-[#1DB954]" />
          ) : (
            <Pin size={14} className="mr-2 text-[#B3B3B3]" />
          )}
          {isPinned ? 'Unpin' : 'Pin to top'}
        </ContextMenuItem>
        <ContextMenuItem
          className="text-white focus:bg-[#3a3a3a] focus:text-white"
        >
          <Share2 size={14} className="mr-2 text-[#B3B3B3]" />
          Share
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#3a3a3a]" />
        <ContextMenuItem
          onClick={onDelete}
          className="text-[#E91429] focus:bg-[#E91429]/10 focus:text-[#E91429]"
        >
          <Trash2 size={14} className="mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ---- Liked Songs Track Row ----

function LikedSongRow({
  track,
  index,
  isPlaying,
  onPlay,
  onUnlike,
  isLiked,
}: {
  track: Track;
  index: number;
  isPlaying: boolean;
  onPlay: (index: number) => void;
  onUnlike: () => void;
  isLiked: boolean;
}) {
  const [swiped, setSwiped] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: swiped ? -80 : 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.02, x: { type: 'spring', damping: 25 } }}
      className="relative"
    >
      {/* Swipe action (unlike) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-4">
        <button
          onClick={() => {
            onUnlike();
            setSwiped(false);
          }}
          className="px-4 py-2 bg-[#E91429] text-white text-xs font-semibold rounded-lg"
        >
          Unlike
        </button>
      </div>

      <div
        className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
          isPlaying ? 'bg-[#1DB954]/10' : 'hover:bg-[#181818]'
        }`}
        onTouchStart={(e) => {
          const startX = e.touches[0].clientX;
          const el = e.currentTarget;
          const onMove = (ev: TouchEvent) => {
            const diff = startX - ev.touches[0].clientX;
            if (diff > 60) setSwiped(true);
            if (diff < -30) setSwiped(false);
          };
          const onEnd = () => {
            el.removeEventListener('touchmove', onMove);
            el.removeEventListener('touchend', onEnd);
          };
          el.addEventListener('touchmove', onMove);
          el.addEventListener('touchend', onEnd);
        }}
      >
        <button
          onClick={() => onPlay(index)}
          className="w-6 text-center flex-shrink-0"
        >
          {isPlaying ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Music2 size={14} className="text-[#1DB954]" />
            </motion.div>
          ) : (
            <span className="text-xs text-[#727272]">{index + 1}</span>
          )}
        </button>

        <button
          onClick={() => onPlay(index)}
          className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0"
        >
          {track.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#282828] flex items-center justify-center">
              <Music2 size={14} className="text-[#1DB954]" />
            </div>
          )}
        </button>

        <button
          onClick={() => onPlay(index)}
          className="flex-1 min-w-0 text-left"
        >
          <p
            className={`text-sm font-medium truncate ${
              isPlaying ? 'text-[#1DB954]' : 'text-white'
            }`}
          >
            {track.title}
          </p>
          <p className="text-xs text-[#B3B3B3] truncate">{track.artist}</p>
        </button>

        <span className="text-xs text-[#727272] hidden sm:block">
          {track.duration ? formatDuration(track.duration) : ''}
        </span>

        <button
          onClick={onUnlike}
          className="p-1.5 rounded-full hover:bg-[#282828] transition-colors flex-shrink-0"
        >
          <Heart
            size={14}
            className={isLiked ? 'text-[#1DB954] fill-[#1DB954]' : 'text-[#727272]'}
          />
        </button>
      </div>
    </motion.div>
  );
}

// ---- History Entry Row ----

function HistoryEntryRow({
  entry,
  isPlaying,
  onPlay,
}: {
  entry: { songId: string; track: Track; playedAt: number; playDuration: number };
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const completionPct = entry.track.duration
    ? Math.min(100, Math.round((entry.playDuration / entry.track.duration) * 100))
    : 0;

  return (
    <motion.button
      onClick={onPlay}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-3 w-full p-2 rounded-xl transition-colors ${
        isPlaying ? 'bg-[#1DB954]/10' : 'hover:bg-[#181818]'
      }`}
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
        {entry.track.thumbnail ? (
          <img
            src={entry.track.thumbnail}
            alt={entry.track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#282828] flex items-center justify-center">
            <Music2 size={14} className="text-[#1DB954]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p
          className={`text-sm font-medium truncate ${
            isPlaying ? 'text-[#1DB954]' : 'text-white'
          }`}
        >
          {entry.track.title}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-[#B3B3B3] truncate">{entry.track.artist}</p>
          {completionPct > 0 && (
            <span className="text-[10px] text-[#727272]">• {completionPct}% played</span>
          )}
        </div>
      </div>
      <span className="text-[10px] text-[#727272] flex-shrink-0">
        {formatTimeAgo(entry.playedAt)}
      </span>
    </motion.button>
  );
}

// ---- Artist Card Component ----

function ArtistCard({
  artist,
  onTap,
}: {
  artist: { id: string; channelId: string; name: string; thumbnail: string; subscriberCount?: string };
  onTap: () => void;
}) {
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-[#181818] transition-colors"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden bg-[#282828] flex-shrink-0 shadow-lg">
        {artist.thumbnail ? (
          <img
            src={artist.thumbnail}
            alt={artist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User size={28} className="text-[#727272]" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white truncate max-w-[100px]">
          {artist.name}
        </p>
        {artist.subscriberCount && (
          <p className="text-xs text-[#727272]">
            {Number(artist.subscriberCount) > 1000000
              ? `${(Number(artist.subscriberCount) / 1000000).toFixed(1)}M`
              : Number(artist.subscriberCount) > 1000
              ? `${(Number(artist.subscriberCount) / 1000).toFixed(0)}K`
              : artist.subscriberCount}{' '}
            subs
          </p>
        )}
      </div>
    </motion.button>
  );
}

// ---- Sort Menu ----

function SortMenu({
  sortType,
  onSortChange,
  onClose,
}: {
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
  onClose: () => void;
}) {
  const sortOptions: { id: SortType; label: string }[] = [
    { id: 'recent', label: 'Recently Added' },
    { id: 'name', label: 'Alphabetical' },
    { id: 'custom', label: 'Custom Order' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      className="absolute right-0 top-10 bg-[#282828] rounded-xl shadow-xl border border-[#3a3a3a] py-1 z-50 min-w-[180px]"
    >
      <div className="px-3 py-2 text-xs text-[#727272] font-medium uppercase tracking-wider">
        Sort by
      </div>
      {sortOptions.map((opt) => (
        <button
          key={opt.id}
          onClick={() => {
            onSortChange(opt.id);
            onClose();
          }}
          className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
            sortType === opt.id
              ? 'text-[#1DB954] bg-[#1DB954]/10'
              : 'text-white hover:bg-[#3a3a3a]'
          }`}
        >
          {opt.label}
          {sortType === opt.id && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
          )}
        </button>
      ))}
    </motion.div>
  );
}

// ---- Main Library Tab Component ----

export function LibraryTab() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { playQueue, currentTrack } = usePlayerStore();
  const {
    likedSongs,
    playlists,
    playlistTracks,
    history,
    pinnedPlaylists,
    togglePinPlaylist,
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    toggleLike,
    isLiked: checkIsLiked,
    unlikeSong,
    clearHistory,
    addTrackToPlaylist,
  } = useLibraryStore();
  const { favoriteArtists } = useUserStore();

  // ---- Sorted Playlists ----
  const sortedPlaylists = useMemo(() => {
    const list = [...playlists];
    switch (sortType) {
      case 'recent':
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'custom':
        // Pinned first, then by update time
        return list.sort((a, b) => {
          const aPinned = pinnedPlaylists.includes(a.id) ? 0 : 1;
          const bPinned = pinnedPlaylists.includes(b.id) ? 0 : 1;
          if (aPinned !== bPinned) return aPinned - bPinned;
          return b.updatedAt - a.updatedAt;
        });
      default:
        return list;
    }
  }, [playlists, sortType, pinnedPlaylists]);

  // ---- Pinned Playlists ----
  const pinnedPlaylistItems = useMemo(
    () => playlists.filter((p) => pinnedPlaylists.includes(p.id)),
    [playlists, pinnedPlaylists]
  );

  // ---- History grouped by date ----
  const groupedHistory = useMemo(() => {
    const groups: Record<string, typeof history> = {};
    for (const entry of history) {
      const group = getDateGroup(entry.playedAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(entry);
    }
    return groups;
  }, [history]);

  // ---- Handlers ----
  const handlePlayLiked = (startIndex: number = 0) => {
    if (likedSongs.length > 0) {
      playQueue(likedSongs, startIndex, 'liked-songs');
    }
  };

  const handleShuffleLiked = () => {
    if (likedSongs.length > 0) {
      const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
      playQueue(shuffled, 0, 'liked-songs:shuffle');
    }
  };

  const handleCreatePlaylist = (name: string, description?: string) => {
    createPlaylist(name, description);
  };

  const handleRenamePlaylist = (id: string) => {
    if (renameValue.trim()) {
      updatePlaylist(id, { name: renameValue.trim() });
      setRenamingPlaylistId(null);
      setRenameValue('');
    }
  };

  const handleDuplicatePlaylist = (playlist: Playlist) => {
    const newPlaylist = createPlaylist(`${playlist.name} (Copy)`, playlist.description);
    const tracks = playlistTracks[playlist.id] || [];
    for (const track of tracks) {
      addTrackToPlaylist(newPlaylist.id, track);
    }
  };

  // ---- Playlist Detail View ----
  if (selectedPlaylist) {
    // Find the latest version of the playlist from the store
    const currentPlaylist = playlists.find((p) => p.id === selectedPlaylist.id);
    if (!currentPlaylist) {
      setSelectedPlaylist(null);
      return null;
    }
    return (
      <PlaylistDetailView
        playlist={currentPlaylist}
        onBack={() => setSelectedPlaylist(null)}
      />
    );
  }

  // ---- Main Library View ----
  return (
    <div className="min-h-screen bg-[#090909]">
      <div className="px-4 pt-[env(safe-area-inset-top)] pb-32">
        {/* Header */}
        <div className="flex items-center justify-between pt-4 mb-4">
          <h1 className="text-2xl font-bold text-white">Your Library</h1>
          <div className="flex items-center gap-2">
            {/* Sort Button */}
            <div className="relative">
              <motion.button
                onClick={() => setShowSortMenu(!showSortMenu)}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-[#181818] hover:bg-[#222222] transition-colors"
              >
                <ArrowUpDown size={18} className="text-[#B3B3B3]" />
              </motion.button>
              <AnimatePresence>
                {showSortMenu && (
                  <SortMenu
                    sortType={sortType}
                    onSortChange={setSortType}
                    onClose={() => setShowSortMenu(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Add Playlist Button */}
            <motion.button
              onClick={() => setShowCreateDialog(true)}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full bg-[#181818] hover:bg-[#222222] transition-colors"
            >
              <Plus size={18} className="text-[#1DB954]" />
            </motion.button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 custom-scrollbar -mx-4 px-4">
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <motion.button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-[#1DB954] text-[#090909]'
                    : 'bg-[#181818] text-[#B3B3B3] hover:bg-[#222222]'
                }`}
              >
                {chip.icon}
                {chip.label}
              </motion.button>
            );
          })}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {/* ---- ALL View ---- */}
          {(activeFilter === 'all' || activeFilter === 'playlists') &&
            activeFilter !== 'liked' &&
            activeFilter !== 'artists' &&
            activeFilter !== 'albums' &&
            activeFilter !== 'history' &&
            activeFilter !== 'pinned' && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Quick Access Cards (shown in 'all' view) */}
                {activeFilter === 'all' && (
                  <div className="space-y-2 mb-6">
                    {/* Liked Songs Quick Card */}
                    <motion.button
                      onClick={() => setActiveFilter('liked')}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-4 p-3 bg-gradient-to-r from-[#1DB954]/20 to-[#181818] rounded-2xl hover:from-[#1DB954]/30 transition-all"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1DB954] to-[#148F3F] flex items-center justify-center shadow-lg flex-shrink-0">
                        <Heart size={24} fill="white" className="text-white" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-white">Liked Songs</p>
                        <p className="text-xs text-[#B3B3B3]">
                          {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-[#727272] flex-shrink-0" />
                    </motion.button>

                    {/* History Quick Card */}
                    <motion.button
                      onClick={() => setActiveFilter('history')}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-4 p-3 bg-[#181818] rounded-2xl hover:bg-[#222222] transition-colors"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#282828] flex items-center justify-center flex-shrink-0">
                        <Clock size={24} className="text-[#1DB954]" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-white">History</p>
                        <p className="text-xs text-[#B3B3B3]">
                          {history.length} {history.length === 1 ? 'track' : 'tracks'}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-[#727272] flex-shrink-0" />
                    </motion.button>
                  </div>
                )}

                {/* Playlists Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Create Playlist Card */}
                  <motion.button
                    onClick={() => setShowCreateDialog(true)}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -2 }}
                    className="w-full text-left bg-transparent border-2 border-dashed border-[#282828] rounded-2xl p-3 hover:border-[#1DB954]/50 transition-colors flex flex-col items-center justify-center min-h-[180px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#181818] flex items-center justify-center mb-3">
                      <Plus size={24} className="text-[#1DB954]" />
                    </div>
                    <p className="text-sm font-medium text-[#B3B3B3]">
                      Create Playlist
                    </p>
                  </motion.button>

                  {/* Playlist Cards */}
                  {sortedPlaylists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      isPinned={pinnedPlaylists.includes(playlist.id)}
                      onTap={() => setSelectedPlaylist(playlist)}
                      onPin={() => togglePinPlaylist(playlist.id)}
                      onDelete={() => deletePlaylist(playlist.id)}
                      onRename={() => {
                        setRenamingPlaylistId(playlist.id);
                        setRenameValue(playlist.name);
                      }}
                      onDuplicate={() => handleDuplicatePlaylist(playlist)}
                    />
                  ))}
                </div>

                {/* Empty State for Playlists */}
                {playlists.length === 0 && activeFilter === 'playlists' && (
                  <EmptyState
                    icon={<ListMusic size={40} className="text-[#282828]" />}
                    title="No Playlists Yet"
                    subtitle="Create your first playlist to organize your favorite music"
                    action={() => setShowCreateDialog(true)}
                    actionLabel="Create Playlist"
                  />
                )}
              </motion.div>
            )}

          {/* ---- LIKED SONGS View ---- */}
          {activeFilter === 'liked' && (
            <motion.div
              key="liked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {likedSongs.length > 0 ? (
                <>
                  {/* Liked Songs Header */}
                  <div className="bg-gradient-to-b from-[#1DB954]/20 to-transparent rounded-2xl p-4 mb-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1DB954] to-[#148F3F] flex items-center justify-center shadow-lg">
                        <Heart size={28} fill="white" className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Liked Songs</h2>
                        <p className="text-sm text-[#B3B3B3]">
                          {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <motion.button
                        onClick={() => handlePlayLiked(0)}
                        whileTap={{ scale: 0.9 }}
                        className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg shadow-[#1DB954]/20"
                      >
                        <Play size={20} fill="#090909" className="text-[#090909] ml-0.5" />
                      </motion.button>
                      <motion.button
                        onClick={handleShuffleLiked}
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-full bg-[#282828] flex items-center justify-center hover:bg-[#3a3a3a] transition-colors"
                      >
                        <Shuffle size={16} className="text-white" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Liked Songs List */}
                  <div className="space-y-0.5">
                    <AnimatePresence mode="popLayout">
                      {likedSongs.map((track, index) => (
                        <LikedSongRow
                          key={track.id}
                          track={track}
                          index={index}
                          isPlaying={currentTrack?.id === track.id}
                          onPlay={handlePlayLiked}
                          onUnlike={() => unlikeSong(track.id)}
                          isLiked={checkIsLiked(track.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<Heart size={40} className="text-[#282828]" />}
                  title="No Liked Songs"
                  subtitle="Heart the songs you love and they'll appear here"
                />
              )}
            </motion.div>
          )}

          {/* ---- ARTISTS View ---- */}
          {activeFilter === 'artists' && (
            <motion.div
              key="artists"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {favoriteArtists.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {favoriteArtists.map((artist) => (
                    <ArtistCard
                      key={artist.channelId}
                      artist={artist}
                      onTap={() => {
                        // Could navigate to search with artist name
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<User size={40} className="text-[#282828]" />}
                  title="No Favorite Artists"
                  subtitle="Follow artists to see them here"
                />
              )}
            </motion.div>
          )}

          {/* ---- ALBUMS View ---- */}
          {activeFilter === 'albums' && (
            <motion.div
              key="albums"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyState
                icon={<Disc3 size={40} className="text-[#282828]" />}
                title="No Saved Albums"
                subtitle="Save albums from search and they'll appear here"
              />
            </motion.div>
          )}

          {/* ---- HISTORY View ---- */}
          {activeFilter === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {history.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Listening History</h2>
                    <motion.button
                      onClick={clearHistory}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#E91429] bg-[#E91429]/10 hover:bg-[#E91429]/20 transition-colors"
                    >
                      <Trash2 size={12} />
                      Clear All
                    </motion.button>
                  </div>

                  {Object.entries(groupedHistory).map(([group, entries]) => (
                    <div key={group} className="mb-6">
                      <h3 className="text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">
                        {group}
                      </h3>
                      <div className="space-y-0.5">
                        {entries.map((entry) => (
                          <HistoryEntryRow
                            key={`${entry.songId}-${entry.playedAt}`}
                            entry={entry}
                            isPlaying={currentTrack?.id === entry.track.id}
                            onPlay={() => playQueue([entry.track], 0, 'history')}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <EmptyState
                  icon={<Clock size={40} className="text-[#282828]" />}
                  title="No Listening History"
                  subtitle="Play some music and your history will show up here"
                />
              )}
            </motion.div>
          )}

          {/* ---- PINNED View ---- */}
          {activeFilter === 'pinned' && (
            <motion.div
              key="pinned"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {pinnedPlaylistItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pinnedPlaylistItems.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      isPinned={true}
                      onTap={() => setSelectedPlaylist(playlist)}
                      onPin={() => togglePinPlaylist(playlist.id)}
                      onDelete={() => deletePlaylist(playlist.id)}
                      onRename={() => {
                        setRenamingPlaylistId(playlist.id);
                        setRenameValue(playlist.name);
                      }}
                      onDuplicate={() => handleDuplicatePlaylist(playlist)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Pin size={40} className="text-[#282828]" />}
                  title="No Pinned Items"
                  subtitle="Pin your favorite playlists and albums for quick access"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Playlist Dialog */}
      <CreatePlaylistDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreatePlaylist}
      />

      {/* Rename Playlist Dialog (inline) */}
      <AnimatePresence>
        {renamingPlaylistId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setRenamingPlaylistId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-2xl p-6 w-full max-w-sm border border-[#282828]"
            >
              <h3 className="text-lg font-bold text-white mb-4">Rename Playlist</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenamePlaylist(renamingPlaylistId)}
                className="w-full px-4 py-2.5 bg-[#090909] text-white text-sm rounded-xl border border-[#282828] focus:border-[#1DB954] focus:outline-none placeholder:text-[#727272] mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setRenamingPlaylistId(null)}
                  className="px-4 py-2 text-sm text-[#B3B3B3] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={() => handleRenamePlaylist(renamingPlaylistId)}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2 bg-[#1DB954] text-[#090909] text-sm font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
                >
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
