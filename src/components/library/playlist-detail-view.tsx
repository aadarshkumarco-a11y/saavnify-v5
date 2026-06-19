'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Music2,
  GripVertical,
  X,
  Plus,
  Search,
  Sparkles,
  Heart,
  MoreVertical,
  Pencil,
  Trash2,
  Pin,
  PinOff,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';
import { formatDuration } from '@/lib/youtube-api';
import { unifiedSearch } from '@/lib/music-aggregator';
import type { Track, Playlist } from '@/types';

// ---- Sortable Track Item ----

function SortableTrackItem({
  track,
  index,
  isPlaying,
  onPlay,
  onRemove,
  isLiked,
  onToggleLike,
}: {
  track: Track;
  index: number;
  isPlaying: boolean;
  onPlay: (index: number) => void;
  onRemove: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-2 p-2 rounded-xl group ${
        isDragging ? 'bg-[#282828] shadow-lg' : isPlaying ? 'bg-[#1DB954]/10' : 'hover:bg-[#181818]'
      } transition-colors`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
      >
        <GripVertical size={16} className="text-[#727272]" />
      </button>

      {/* Track Number / Playing Indicator */}
      <div className="w-6 text-center">
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
      </div>

      {/* Thumbnail */}
      <button
        onClick={() => onPlay(index)}
        className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative group/thumb"
      >
        {track.thumbnail ? (
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#282828] flex items-center justify-center">
            <Music2 size={12} className="text-[#1DB954]" />
          </div>
        )}
      </button>

      {/* Track Info */}
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

      {/* Duration */}
      <span className="text-xs text-[#727272] hidden sm:block">
        {track.duration ? formatDuration(track.duration) : ''}
      </span>

      {/* Like Button */}
      <button
        onClick={onToggleLike}
        className="p-1.5 rounded-full hover:bg-[#282828] transition-colors"
      >
        <Heart
          size={14}
          className={isLiked ? 'text-[#1DB954] fill-[#1DB954]' : 'text-[#727272]'}
        />
      </button>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-1.5 rounded-full hover:bg-[#282828] opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={14} className="text-[#727272] hover:text-[#E91429]" />
      </button>
    </motion.div>
  );
}

// ---- Add Tracks Search ----

function AddTracksSearch({
  playlistId,
  onAdded,
}: {
  playlistId: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { addTrackToPlaylist, playlistTracks } = useLibraryStore();
  const { addSearchHistory } = useLibraryStore();

  const existingTracks = playlistTracks[playlistId] || [];
  const existingIds = new Set(existingTracks.map((t) => t.id));

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    addSearchHistory(query.trim());
    try {
      // Use the unified aggregator (InnerTube → Piped → JioSaavn)
      // instead of the legacy YouTube Data API v3.
      const searchResults = await unifiedSearch(query.trim(), 15);
      setResults(searchResults.tracks);
    } catch {
      setResults([]);
    }
    setIsSearching(false);
  }, [query, addSearchHistory]);

  const handleAddTrack = (track: Track) => {
    addTrackToPlaylist(playlistId, track);
    onAdded();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#727272]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for songs to add..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#090909] text-white text-sm rounded-xl border border-[#282828] focus:border-[#1DB954] focus:outline-none placeholder:text-[#727272]"
            autoFocus
          />
        </div>
        <motion.button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2.5 bg-[#1DB954] text-[#090909] text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1ed760] transition-colors"
        >
          {isSearching ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Search size={16} />
            </motion.div>
          ) : (
            'Search'
          )}
        </motion.button>
      </div>

      {results.length > 0 && (
        <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
          {results.map((track) => {
            const alreadyAdded = existingIds.has(track.id);
            return (
              <div
                key={track.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#181818] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                      <Music2 size={12} className="text-[#1DB954]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{track.title}</p>
                  <p className="text-xs text-[#B3B3B3] truncate">{track.artist}</p>
                </div>
                <motion.button
                  onClick={() => handleAddTrack(track)}
                  disabled={alreadyAdded}
                  whileTap={{ scale: alreadyAdded ? 1 : 0.9 }}
                  className={`p-1.5 rounded-full transition-colors ${
                    alreadyAdded
                      ? 'text-[#1DB954]'
                      : 'text-[#727272] hover:text-[#1DB954] hover:bg-[#1DB954]/10'
                  }`}
                >
                  <Plus size={16} className={alreadyAdded ? 'text-[#1DB954]' : ''} />
                </motion.button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Main Playlist Detail View ----

export function PlaylistDetailView({
  playlist,
  onBack,
}: {
  playlist: Playlist;
  onBack: () => void;
}) {
  const [showAddTracks, setShowAddTracks] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(playlist.name);

  const { playQueue, currentTrack } = usePlayerStore();
  const {
    playlistTracks,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    toggleLike,
    isLiked: checkIsLiked,
    updatePlaylist,
    deletePlaylist,
    togglePinPlaylist,
    pinnedPlaylists,
  } = useLibraryStore();

  const tracks = playlistTracks[playlist.id] || [];
  const isPinned = pinnedPlaylists.includes(playlist.id);

  const isCurrentTrackInPlaylist =
    currentTrack && tracks.some((t) => t.id === currentTrack.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tracks.findIndex((t) => t.id === active.id);
    const newIndex = tracks.findIndex((t) => t.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderPlaylistTracks(playlist.id, oldIndex, newIndex);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playQueue(tracks, 0, `playlist:${playlist.id}`);
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playQueue(shuffled, 0, `playlist:${playlist.id}:shuffle`);
    }
  };

  const handlePlayTrack = (index: number) => {
    playQueue(tracks, index, `playlist:${playlist.id}`);
  };

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== playlist.name) {
      updatePlaylist(playlist.id, { name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleDelete = () => {
    deletePlaylist(playlist.id);
    onBack();
  };

  // Generate gradient for playlist header
  const gradients = [
    'from-[#1DB954]/30 to-[#181818]',
    'from-[#E91429]/20 to-[#181818]',
    'from-[#8B5CF6]/20 to-[#181818]',
    'from-[#F59E0B]/20 to-[#181818]',
    'from-[#EC4899]/20 to-[#181818]',
  ];
  const gradientIndex =
    playlist.name.length % gradients.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="pb-4"
    >
      {/* Header */}
      <div
        className={`bg-gradient-to-b ${gradients[gradientIndex]} px-4 pt-[env(safe-area-inset-top)] pb-6`}
      >
        <div className="flex items-center gap-3 pt-4 mb-4">
          <motion.button
            onClick={onBack}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </motion.button>
          <div className="flex-1" />
          <div className="relative">
            <motion.button
              onClick={() => setShowMenu(!showMenu)}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            >
              <MoreVertical size={20} className="text-white" />
            </motion.button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute right-0 top-10 bg-[#282828] rounded-xl shadow-xl border border-[#3a3a3a] py-1 z-50 min-w-[180px]"
                >
                  <button
                    onClick={() => {
                      setIsRenaming(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-[#3a3a3a] transition-colors"
                  >
                    <Pencil size={14} />
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      togglePinPlaylist(playlist.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-[#3a3a3a] transition-colors"
                  >
                    {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                    {isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <div className="h-px bg-[#3a3a3a] my-1" />
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#E91429] hover:bg-[#E91429]/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete Playlist
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Playlist Artwork & Info */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#282828] to-[#181818] flex items-center justify-center shadow-2xl mb-4 overflow-hidden"
          >
            {playlist.isSmart ? (
              <div className="relative">
                <Sparkles size={48} className="text-[#1DB954]" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute inset-0"
                >
                  <Sparkles size={48} className="text-[#1DB954]/30" />
                </motion.div>
              </div>
            ) : (
              <Music2 size={48} className="text-[#1DB954]" />
            )}
          </motion.div>

          {isRenaming ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                onBlur={handleRename}
                className="text-xl font-bold text-white bg-transparent border-b-2 border-[#1DB954] outline-none text-center"
                autoFocus
              />
            </div>
          ) : (
            <h1 className="text-xl font-bold text-white mb-1">{playlist.name}</h1>
          )}

          {playlist.description && (
            <p className="text-sm text-[#B3B3B3] mb-1">{playlist.description}</p>
          )}

          {playlist.isSmart && (
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={12} className="text-[#1DB954]" />
              <span className="text-xs text-[#1DB954]">Smart Playlist</span>
            </div>
          )}

          <p className="text-sm text-[#B3B3B3]">
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            {isPinned && (
              <span className="ml-2 inline-flex items-center gap-1">
                • <Pin size={10} className="text-[#1DB954]" /> Pinned
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Play Controls */}
      <div className="px-4 py-4 flex items-center gap-3">
        <motion.button
          onClick={handlePlayAll}
          disabled={tracks.length === 0}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg shadow-[#1DB954]/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1ed760] transition-colors"
        >
          <Play size={24} fill="#090909" className="text-[#090909] ml-0.5" />
        </motion.button>

        <motion.button
          onClick={handleShufflePlay}
          disabled={tracks.length === 0}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-full bg-[#282828] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a3a3a] transition-colors"
        >
          <Shuffle size={18} className="text-white" />
        </motion.button>

        <div className="flex-1" />

        <motion.button
          onClick={() => setShowAddTracks(!showAddTracks)}
          whileTap={{ scale: 0.9 }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            showAddTracks
              ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30'
              : 'bg-[#282828] text-white hover:bg-[#3a3a3a]'
          }`}
        >
          <Plus size={16} />
          Add Songs
        </motion.button>
      </div>

      {/* Add Tracks Panel */}
      <AnimatePresence>
        {showAddTracks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 overflow-hidden"
          >
            <div className="bg-[#181818] rounded-2xl p-4 mb-4">
              <AddTracksSearch playlistId={playlist.id} onAdded={() => {}} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track List */}
      <div className="px-4">
        {tracks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tracks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                <AnimatePresence mode="popLayout">
                  {tracks.map((track, index) => (
                    <SortableTrackItem
                      key={track.id}
                      track={track}
                      index={index}
                      isPlaying={
                        !!(isCurrentTrackInPlaylist && currentTrack?.id === track.id)
                      }
                      onPlay={handlePlayTrack}
                      onRemove={() =>
                        removeTrackFromPlaylist(playlist.id, track.id)
                      }
                      isLiked={checkIsLiked(track.id)}
                      onToggleLike={() => toggleLike(track)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 rounded-full bg-[#181818] flex items-center justify-center mx-auto mb-4">
              <Music2 size={32} className="text-[#282828]" />
            </div>
            <p className="text-[#B3B3B3] font-medium mb-1">No songs yet</p>
            <p className="text-[#727272] text-sm mb-4">
              Add some songs to get started
            </p>
            <motion.button
              onClick={() => setShowAddTracks(true)}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 bg-[#1DB954] text-[#090909] text-sm font-semibold rounded-full hover:bg-[#1ed760] transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Add Songs
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
