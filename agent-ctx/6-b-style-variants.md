# Task 6-b — Style Variants Agent

**File created:** `src/components/tabs/style-variants.tsx` (~2640 lines)
**No other files modified.**

## Exports

### Home variants
- `ClassicHome` — greeting + date header, quick-play grid, trending grid, mood pills, continue-listening carousel, favorite artists, new releases. `#1DB954` accent.
- `PlayfulHome` — rounded-3xl pastel gradient cards (pink/purple/emerald/amber/rose/sky/violet/cyan), "Jump back in" carousel, "Made for you" gradient tiles, emoji accents (🎵🔥✨), bouncy `scale:1.02` hover.
- `NeonHome` — `bg-[#050505]` cyberpunk, `#00ff41` + `#00d9ff` accents, `font-mono`, scanline overlay, "System Online" status bar, glitch-per-letter greeting, `>// FEATURED` headers, neon-glow track cards.
- `SpotifyHome` — "Good evening" big bold heading, 6 quick-pick tiles, "Made for you" rounded cards, "Recently played" horizontal scroll, green `#1DB954` accent, tight spacing.

### Library variants
- `ClassicLibrary` — 4 pill tabs (Playlists/Liked/History/Downloads), sorted playlist grid, liked-songs hero + track list, history list, downloads empty state. Reuses `CreatePlaylistDialog`.
- `PlayfulLibrary` — pink→purple gradient header, gradient pill tabs with emoji, playlists as colorful gradient tiles, big heart-gradient "Liked Songs" hero, rounded-2xl track rows.
- `NeonLibrary` — `>// LIBRARY` glowing header, scanlines, `font-mono`, neon-outline pill tabs, dark cards with neon-green borders + glow on hover, liked-songs counter with `text-glow-green` + zero-padded count.

### Dispatchers
- `HomeVariant({ style }: { style: 'classic' | 'playful' | 'neon' | 'spotify' })`
- `LibraryVariant({ style }: { style: 'classic' | 'playful' | 'neon' })`
- Re-exported `HomeStyle` and `LibraryStyle` type unions.

## Data flow

- **Home:** shared `useHomeData()` hook calls `getAggregatedTrending(20)`, `getBollywoodHits(15)`, `getPunjabiHits(15)`, `getNewReleasesIndia(15)` from `@/lib/music-aggregator` — same real-data source as `HomeTab`. Returns `{ trending, bollywood, punjabi, newReleases, loading, error, refresh }`.
- **Library:** subscribes to `useLibraryStore` (Zustand) for `likedSongs`, `playlists`, `history`, `pinnedPlaylists` — same reactive store as `LibraryTab`. Also uses `usePlayerStore` for `playQueue`/`play`/`currentTrack` and `useUserStore` for `favoriteArtists` fallback.
- **Playback:** lists use `playQueue(list, index, source)`, single tracks use `play(track, source)`. Both call `addToHistory(track)` from the library store.
- **Likes:** `toggleLike(track)` + `isLiked(track.id)`.

## Lint / Type status

- `bunx eslint src/components/tabs/style-variants.tsx` → **exit 0**, 0 errors, 0 warnings.
- `bunx tsc --noEmit --skipLibCheck | grep style-variants` → **no output** (0 type errors in this file).
- Pre-existing type errors in `music-aggregator.ts`, `innertube-api.ts`, `cache-manager.ts`, `player-store.ts`, `settings-store.ts`, `types/index.ts` are unrelated and were not touched.

## Notable fixes during development

1. **`react-hooks/set-state-in-effect`** — the original `useHomeData` had `loadAll()` (which sync-called `setLoading`/`setError`) invoked from a `useEffect`. Refactored into:
   - `runFetches()` — only async setState (`.then`/`.catch`/`.finally`), safe to call from effect body.
   - `refresh()` — sync setState reset, only ever called from `onClick` handlers.
   - Initial `useState` already provides `loading=true` / `error=null`, so the mount effect doesn't need any sync reset.
2. **`react/jsx-no-comment-textnodes`** — two `<p>` elements contained plain `// no previous session found` / `// no data stream` text. Wrapped each in `{'...'}` JSX expression.
3. **Type mismatch** — `ClassicHome` was passing `onPlay=` to `ClassicSection` which expects `onPlayTrack=`. Renamed 4 call sites.

## How a consumer wires this up

```tsx
import { HomeVariant, LibraryVariant } from '@/components/tabs/style-variants';

<HomeVariant style="neon" />
<LibraryVariant style="playful" />
```

## Dev server

Dev server continues serving `/` with 200 OK responses throughout development (verified via `dev.log`).
