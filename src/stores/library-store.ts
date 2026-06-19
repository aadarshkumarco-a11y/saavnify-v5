import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Track, Playlist, HistoryEntry, SearchHistoryEntry } from '@/types';

// Safe storage that handles WebView localStorage errors
const safeStorage = createJSONStorage(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // localStorage not available
  }
  const store = new Map<string, string>();
  return {
    getItem: (name: string) => store.get(name) ?? null,
    setItem: (name: string, value: string) => { store.set(name, value); },
    removeItem: (name: string) => { store.delete(name); },
  };
});

interface LibraryStore {
  likedSongs: Track[];
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => void;
  likeSong: (track: Track) => void;
  unlikeSong: (trackId: string) => void;

  playlists: Playlist[];
  playlistTracks: Record<string, Track[]>;
  createPlaylist: (name: string, description?: string) => Playlist;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylistTracks: (playlistId: string, oldIndex: number, newIndex: number) => void;

  history: HistoryEntry[];
  addToHistory: (track: Track, playDuration?: number) => void;
  clearHistory: () => void;

  pinnedPlaylists: string[];
  togglePinPlaylist: (playlistId: string) => void;

  searchHistory: SearchHistoryEntry[];
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  removeSearchHistoryEntry: (id: number) => void;
}

let playlistCounter = 0;

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set, get) => ({
      likedSongs: [],
      playlists: [],
      playlistTracks: {},
      history: [],
      pinnedPlaylists: [],
      searchHistory: [],

      isLiked: (trackId: string) => {
        return get().likedSongs.some((s) => s.id === trackId);
      },

      toggleLike: (track: Track) => {
        const { likedSongs } = get();
        const isLiked = likedSongs.some((s) => s.id === track.id);
        if (isLiked) {
          set({ likedSongs: likedSongs.filter((s) => s.id !== track.id) });
        } else {
          set({ likedSongs: [track, ...likedSongs] });
        }
      },

      likeSong: (track: Track) => {
        const { likedSongs } = get();
        if (!likedSongs.some((s) => s.id === track.id)) {
          set({ likedSongs: [track, ...likedSongs] });
        }
      },

      unlikeSong: (trackId: string) => {
        set({ likedSongs: get().likedSongs.filter((s) => s.id !== trackId) });
      },

      createPlaylist: (name: string, description?: string) => {
        const now = Date.now();
        playlistCounter += 1;
        const playlist: Playlist = {
          id: `playlist-${now}-${playlistCounter}`,
          name,
          description,
          createdAt: now,
          updatedAt: now,
          trackCount: 0,
        };
        set({
          playlists: [...get().playlists, playlist],
          playlistTracks: { ...get().playlistTracks, [playlist.id]: [] },
        });
        return playlist;
      },

      updatePlaylist: (id: string, updates: Partial<Playlist>) => {
        set({
          playlists: get().playlists.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        });
      },

      deletePlaylist: (id: string) => {
        const newPlaylistTracks = { ...get().playlistTracks };
        delete newPlaylistTracks[id];
        set({
          playlists: get().playlists.filter((p) => p.id !== id),
          pinnedPlaylists: get().pinnedPlaylists.filter((pid) => pid !== id),
          playlistTracks: newPlaylistTracks,
        });
      },

      addTrackToPlaylist: (playlistId: string, track: Track) => {
        const tracks = get().playlistTracks[playlistId] || [];
        if (tracks.some((t) => t.id === track.id)) return;
        const newTracks = [...tracks, track];
        set({
          playlists: get().playlists.map((p) =>
            p.id === playlistId
              ? { ...p, trackCount: newTracks.length, updatedAt: Date.now() }
              : p
          ),
          playlistTracks: { ...get().playlistTracks, [playlistId]: newTracks },
        });
      },

      removeTrackFromPlaylist: (playlistId: string, trackId: string) => {
        const tracks = get().playlistTracks[playlistId] || [];
        const newTracks = tracks.filter((t) => t.id !== trackId);
        set({
          playlists: get().playlists.map((p) =>
            p.id === playlistId
              ? { ...p, trackCount: newTracks.length, updatedAt: Date.now() }
              : p
          ),
          playlistTracks: { ...get().playlistTracks, [playlistId]: newTracks },
        });
      },

      reorderPlaylistTracks: (playlistId: string, oldIndex: number, newIndex: number) => {
        const tracks = get().playlistTracks[playlistId];
        if (!tracks) return;
        const newTracks = [...tracks];
        const [moved] = newTracks.splice(oldIndex, 1);
        newTracks.splice(newIndex, 0, moved);
        set({
          playlistTracks: { ...get().playlistTracks, [playlistId]: newTracks },
          playlists: get().playlists.map((p) =>
            p.id === playlistId ? { ...p, updatedAt: Date.now() } : p
          ),
        });
      },

      addToHistory: (track: Track, playDuration: number = 0) => {
        const entry: HistoryEntry = {
          songId: track.id,
          track,
          playedAt: Date.now(),
          playDuration,
        };
        const history = [entry, ...get().history].slice(0, 500);
        set({ history });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      togglePinPlaylist: (playlistId: string) => {
        const { pinnedPlaylists } = get();
        if (pinnedPlaylists.includes(playlistId)) {
          set({ pinnedPlaylists: pinnedPlaylists.filter((id) => id !== playlistId) });
        } else {
          set({ pinnedPlaylists: [...pinnedPlaylists, playlistId] });
        }
      },

      addSearchHistory: (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        const filtered = get().searchHistory.filter(
          (entry) => entry.query.toLowerCase() !== trimmed.toLowerCase()
        );
        const entry: SearchHistoryEntry = {
          id: Date.now(),
          query: trimmed,
          searchedAt: Date.now(),
        };
        set({ searchHistory: [entry, ...filtered].slice(0, 50) });
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] });
      },

      removeSearchHistoryEntry: (id: number) => {
        set({
          searchHistory: get().searchHistory.filter((entry) => entry.id !== id),
        });
      },
    }),
    {
      name: 'saavnify-library',
      storage: safeStorage,
    }
  )
);
