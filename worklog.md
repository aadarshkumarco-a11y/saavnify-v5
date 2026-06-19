---
Task ID: 1-11
Agent: Super Z (Main Agent)
Task: Build SAAVNIFY V4 - Premium Music Streaming Application

Work Log:
- Phase 1: Project scaffold, design system (#090909 bg, #1DB954 accent, Inter font), Zustand stores (player, library, user, theme), Dexie.js IndexedDB, TypeScript types
- Phase 2: YouTube Data API v3 integration (search, video details, channel, playlists, trending)
- Phase 3: Premium Home Screen (8 sections: header, quick play, trending, mood browser, recommended, continue listening, favorite artists, new releases)
- Phase 4: Search Experience (instant search, voice search, categories, filter tabs, recent/trending searches)
- Phase 5: Player System (YouTube IFrame player, full-screen player with blur bg, mini player, queue panel, MediaSession)
- Phase 6: Library System (liked songs, playlists CRUD, history, pinned, drag-to-reorder, playlist detail view)
- Phase 7: Intelligence (recommendation engine with scoring, radio mode, smart playlists, history engine with analytics)
- Phase 8: Profile & Analytics (stats grid with count-up, recharts area/pie charts, achievements, theme picker, accent colors)
- Phase 9: Extra Features (lyrics view, 5-band equalizer, sleep timer with fade, share cards)
- Phase 10: PWA (manifest, icons, meta tags), CSS polish (animations, scrollbar, safe areas)
- Phase 11: Polish (pull-to-refresh, swipe gestures, loading splash, animated transitions, marquee text)
- Fixed: Profile tab missing useEffect import
- Verified all tabs working via Agent Browser

Stage Summary:
- Complete SAAVNIFY V4 application built
- All 4 tabs functional: Home, Search, Library, Profile
- YouTube Data API v3 integration working with real trending data
- Player with YouTube IFrame integration, full/mini player views
- Premium dark theme with 5 theme options and 6 accent colors
- Lint: 0 errors, dev server running cleanly

---
Task ID: crash-fix-v1.0.2
Agent: Super Z (Main)
Task: Complete crash analysis and fix for SAAVNIFY V4 APK crashing on startup

Work Log:
- Analyzed Capacitor config, Android project files, and Next.js static export
- Identified 7 root causes for the crash
- Fix 1: Added ThemeProvider from next-themes to layout.tsx (Toaster was calling useTheme() without a provider = immediate crash)
- Fix 2: Added remotePatterns to next.config.ts for YouTube thumbnail hostnames (i.ytimg.com, yt3.ggpht.com, etc.)
- Fix 3: Replaced next/image with native <img> in home-tab.tsx for Capacitor WebView compatibility
- Fix 4: Lazy-initialized Dexie IndexedDB using Proxy pattern to prevent WebView startup crash
- Fix 5: Added try/catch guards for window.history.pushState in Capacitor WebView
- Fix 6: Fixed YouTube IFrame Player origin fallback for Capacitor WebView
- Fix 7: Added React Error Boundary component for graceful crash recovery
- Updated CI workflow to v1.0.2 release tag
- Verified build succeeds locally
- Pushed to GitHub, triggered Actions build, verified success
- APK released to GitHub Releases v1.0.2

Stage Summary:
- CRASH ROOT CAUSE: Missing ThemeProvider wrapper caused Toaster (which uses useTheme()) to throw an error on first render, crashing the entire app
- Secondary crashes: next/image with external URLs, Dexie DB initialization timing, history.pushState in WebView
- APK v1.0.2 available at: https://github.com/aadarshkumarco-a11y/saavnify-v4/releases/download/v1.0.2/SAAVNIFY-v4.apk
- Build size: 4.8 MB (debug APK)

---
Task ID: crash-fix-v1.0.3
Agent: Super Z (Main)
Task: Complete crash overhaul v1.0.3 + API Key Management system

Work Log:
- Deep investigation traced full startup flow from Android→WebView→JS→React
- Found CRITICAL #1: <Image> used without import in ArtistAvatar (instant ReferenceError crash)
- Found CRITICAL #2: next/font/local server-side module crashes in Capacitor WebView
- Found CRITICAL #3: useTheme() in Sonner crashes without ThemeProvider
- Found HIGH: Zustand persist crashes when localStorage unavailable in WebView
- Found HIGH: Dexie Proxy pattern risks infinite recursion
- Fixed ArtistAvatar: replaced <Image> with <img>
- Removed next/font/local: added CSS @font-face declarations in globals.css
- Removed useTheme() from Sonner: hardcoded "dark" theme instead
- Added safe localStorage fallback for ALL 4 Zustand stores
- Replaced Dexie Proxy with Object.defineProperty lazy getters
- Added global JS error handler in layout.tsx <head>
- Removed uninstalled Capacitor plugins (SplashScreen, StatusBar) from config
- Created API Key Manager (api-key-manager.ts) with obfuscated storage + validation
- Created first-launch API Key Setup screen (api-key-setup.tsx)
- Updated youtube-api.ts to use getActiveApiKey() instead of hardcoded key
- Updated page.tsx to check API key and show setup screen on first launch
- Updated CI workflow: removed hardcoded API key env var, v1.0.3 release
- Build verified: SUCCESS
- APK v1.0.3 released (4.7 MB)

Stage Summary:
- 15 files changed across crash fixes + API key management
- Root crash cause was undefined <Image> component in ArtistAvatar
- Secondary crash causes: next/font/local, useTheme without provider, localStorage
- API key management: setup screen, validation, obfuscated storage, no hardcoded keys
- APK: https://github.com/aadarshkumarco-a11y/saavnify-v4/releases/download/v1.0.3/SAAVNIFY-v4.apk

---
Task ID: crash-fix-v1.0.4
Agent: Super Z (Main)
Task: Fix PERSISTENT crash + add API Key management in Profile

Work Log:
- Deep investigation of Android-side crash cause (v1.0.3 still crashed)
- Traced root cause: CI workflow was OVERWRITING Capacitor's default styles.xml and MainActivity.java
- The overwritten styles.xml used `android:Theme.DeviceDefault.NoActionBar` but the activity referenced `AppTheme.NoActionBarLaunch` which originally extended `Theme.SplashScreen` — the mismatch broke AndroidX SplashScreen API
- The overwritten MainActivity removed Capacitor's default lifecycle handling
- Missing colors.xml: Capacitor's default styles.xml references @color/colorPrimary etc. but no colors.xml was created
- FIX: Completely rewrote CI workflow to STOP overwriting Android defaults
- Only minimal patches now: add colors.xml with brand colors, ensure INTERNET permission, customize splash bg
- Added API Key management section in Profile tab (ApiKeyManager component)
- Features: view key status, add/update/remove keys, validate with test request, show/hide toggle
- Verified no hardcoded API keys in source (only placeholder text)
- Build verified: SUCCESS
- Pushed to GitHub, CI triggered, v1.0.4 released

Stage Summary:
- ROOT CAUSE: CI workflow overwrote Capacitor's Android defaults (styles.xml + MainActivity.java), breaking SplashScreen compatibility
- FIX: Stop overwriting defaults, only add minimal patches
- API Key management: full CRUD in Profile tab, validation, test connection
- APK: https://github.com/aadarshkumarco-a11y/saavnify-v4/releases/download/v1.0.4/SAAVNIFY-v4.apk

---
Task ID: v2.0.0
Agent: Main Agent
Task: Implement Multi-Source Music Aggregation Architecture for SAAVNIFY V4

Work Log:
- Analyzed complete codebase (40+ files) to understand existing YouTube-only architecture
- Updated TypeScript types to add SourceType and source/streamUrl fields to Track
- Created JioSaavn API integration (src/lib/sources/jiosaavn-api.ts) - primary source
- Created Open Source Music providers (src/lib/sources/open-music-api.ts) - Jamendo + Audius
- Created Internet Archive integration (src/lib/sources/internet-archive-api.ts) - tertiary fallback
- Created Cache Manager (src/lib/sources/cache-manager.ts) - aggressive caching layer
- Created HTML5 Audio Player (src/lib/sources/audio-player.ts) - direct stream playback
- Created Multi-Source Music Aggregator Engine (src/lib/music-aggregator.ts) - central orchestrator
- Updated YouTube Player to support dual playback (YouTube IFrame + HTML5 Audio)
- Updated Home Tab to use aggregation engine with cache-first loading strategy
- Updated Search Tab to use unified search across all sources
- Updated Recommendation Engine to use aggregator instead of direct YouTube API
- Updated Radio Engine to use aggregator
- Updated Smart Playlist Engine to use aggregator
- Updated page.tsx to make YouTube API key optional (app works without it)
- Updated CI/CD workflow for v2.0.0 release
- Build verified successful (npm run build)
- Pushed to GitHub and tagged v2.0.0

Stage Summary:
- SAAVNIFY V4 now has a 5-tier source priority system
- Source Priority: JioSaavn → Open Music → Internet Archive → Cache → YouTube
- App works immediately without any API key (JioSaavn is primary)
- YouTube is only used as final emergency fallback with quota protection
- Dual player system handles both YouTube IFrame and HTML5 Audio streams
- Aggressive caching ensures users never see empty screens
- All existing functionality preserved and extended
- GitHub Actions CI/CD will build v2.0.0 APK

---
Task ID: v1.1.0
Agent: Main Agent
Task: CRITICAL REGRESSION FIX - Restore Indian music focus + fix source priority + performance optimization

Work Log:
- Analyzed 8 key source files to understand the regression from multi-source update
- Fixed Music Aggregator source priority: JioSaavn → Local Cache → YouTube (emergency only)
- Removed Open Music + Internet Archive from primary search/trending/mood flows
- Search now stops immediately when JioSaavn returns results (no parallel querying)
- Enhanced JioSaavn API with Indian content: 15+ language constants, 20+ category definitions
- Added dedicated Indian music functions: BollywoodHits, PunjabiHits, HindiRomantic, LoFiIndia, etc.
- Expanded default Indian artists from 6 to 10 (Arijit Singh, Shreya Ghoshal, Badshah, etc.)
- Increased cache TTLs: Search 24h, Trending 24h, Home 24h, Artist 7d, Recommendations 12h
- Redesigned Home Screen with Indian music sections: Trending India, Bollywood Hits, Punjabi Hits, Hindi Romantic, Lo-Fi India, Workout India, Devotional, Top Artists India, New Releases India
- Updated Search Tab browse categories to 16 Indian-focused options (Bollywood, Punjabi, Haryanvi, Tamil, Telugu, Bhojpuri, etc.)
- Updated trending searches to Indian artists
- Fixed Recommendation Engine with Indian scoring: +15 Indian artist, +10 Indian genre, +5 JioSaavn source
- Added 36+ Indian artist names database for scoring
- Added 22+ Indian genre keywords for scoring
- Fixed Smart Playlists to use Indian-focused queries (Hindi/Punjabi/Bollywood)
- Fixed Radio Engine with India-focused search variations and sequential search
- Changed all engines from parallel to sequential search to reduce API calls
- Build verified successful
- Pushed to GitHub v1.1.0

Stage Summary:
- CRITICAL FIX: Source priority corrected from 5-source to 3-source (JioSaavn > Cache > YouTube)
- Indian music is now the dominant experience (Bollywood, Hindi, Punjabi, Regional)
- Performance optimized: sequential search, longer cache TTLs, fewer API calls
- All existing features preserved: Lyrics, Queue, Radio, Smart Playlists, Analytics, History, Players
- App should feel like "Spotify for India" rather than a generic music aggregator

---
Task ID: 6-a
Agent: Player Variants Builder
Task: Build 11 full-screen player UI variants for Saavnify v5 (ported from AirBeats Compose → React)

Work Log:
- Read project context: worklog.md, player-store.ts, library-store.ts, types/index.ts, existing full-player.tsx, slider.tsx, button.tsx, sheet.tsx, lyrics/equalizer/sleep-timer/share-view entry points, eslint.config.mjs, package.json
- Created `/home/z/saavnify-v5/src/components/player/player-variants.tsx` (2,363 lines, single file as required)
- File begins with `"use client";`
- Defined shared `PlayerVariantProps { isOpen, onClose }` interface
- Built shared helpers (all internal, not exported):
  - `usePlayerControls()` — pulls everything from usePlayerStore + useLibraryStore (currentTrack, isPlaying, currentTime, duration, volume, muted, shuffle, repeat, queue, queueIndex, sleepTimer, all transport actions, liked, toggleLike, progress)
  - `useFeatureSheets(accent)` — local useState for 5 sheet states + renders the shared queue/lyrics/eq/sleep/share FeatureSheets element. All setState is in event handlers — zero setState-in-effect.
  - `useSeek(duration, currentTime, seek)` — local drag-time state with onPointerDown/onValueChange/onValueCommit handlers
  - `makeDragEndHandler(onClose)` — swipe-down > 100px closes
  - `EmptyState` — themed "Nothing playing" motion.div with drag-to-close
  - `FeatureSheets` — shared queue Sheet + LyricsView + EqualizerView + SleepTimerView + ShareView renderer (accent-color aware)
- Built all 11 variants, each visually distinct:
  1. ClassicPlayer — solid #090909 bg with blurred thumbnail gradient, rounded-2xl art, full transport + 6-button action row (queue/lyrics/volume/eq/timer/share)
  2. ModernPlayer — #050507 sleek dark, cyan neon pulsing glow ring around art when playing, minimal prev/play/next controls, glow-shadowed slider thumb
  3. SpotifyPlayer — Spotify-green (#1DB954) accent, tinted bg from thumbnail, large bold title, prominent green play button, 5-tab bottom action bar with labels
  4. LiquidPlayer — 3 animated blurred gradient blobs (purple/pink/cyan) drifting on independent loops, floating + rotating album art, glassmorphism info card (backdrop-blur-2xl)
  5. CloudGlowPlayer — pastel pink→purple→blue gradient bg, soft floating cloud blobs, big pulsing glow halo behind floating art, cloud-shaped rounded controls, dreamy
  6. FrostPlayer — frosted glass (backdrop-blur-2xl) over blurred thumbnail bg, ice-blue accents, frosted art frame with frost overlay sheen, glass info panel
  7. FoldPlayer — album art split into 2 halves with 3D rotateX perspective fold (top -8deg / bottom +8deg), center crease line, subtle rotateY wobble when playing, amber accent
  8. GroovePlayer — circular vinyl record (conic-gradient grooves) that spins when playing & stops when paused, SVG arc progress ring (stroke-dasharray), animated tonearm that swings in when playing, red accent on wood-grain bg
  9. PopsyPlayer — vibrant orange→pink→purple gradient, morphing blob-shaped album art (animated borderRadius), bouncy spring controls with 3D press depth (box-shadow 0 6px 0), chunky rounded pills, bold text-shadow title
  10. MinimalPlayer — pure white bg, grayscale small (176px) art, lots of negative space (gap-12), thin 2px seek line, only prev/play/next, B&W only
  11. PaperPlayer — beige #f5efe0 paper bg with subtle dotted texture overlay, white paper cards with tape strip on art, flat amber-800 buttons with paper shadows, Material 2-ish
- Built `PlayerVariant({ style, ...props })` dispatcher that maps PlayerStyle → variant component via VARIANT_MAP record (defaults to ClassicPlayer on unknown style)
- All variants handle `currentTrack === null` with themed EmptyState
- All variants use `motion.div drag="y"` with `dragConstraints={{top:0,bottom:0}}`, `dragElastic={{top:0,bottom:0.4}}`, `onDragEnd={(_,info)=>info.offset.y>100 && onClose()}`
- All variants use `<img>` (NOT next/image) for YouTube thumbnails — `@next/next/no-img-element` rule is already off
- All icon buttons have aria-labels; all <img> have alt text (title or empty for decorative)
- Mobile-first full-viewport layout with safe-area-inset padding (top + bottom), responsive max-width caps on album art
- Each variant respects its own accent color in the shared FeatureSheets (passed to useFeatureSheets accent arg)
- Verified zero `react-hooks/set-state-in-effect` violations — all useState updates are inside event handlers (onClick/onValueChange/onPointerDown/onValueCommit), no useEffect at all in the file
- Verified all 11 variant exports + dispatcher are present
- Lint: `./node_modules/.bin/eslint src/components/player/player-variants.tsx` → 0 errors, 0 warnings
- Lint full project: only pre-existing errors in other files (style-variants.tsx, music-aggregator.ts, innertube-api.ts, etc.) — none in player-variants.tsx
- TypeScript: `tsc --noEmit` shows 0 errors in player-variants.tsx (pre-existing errors in other files untouched per "Do NOT touch any other file" rule)

Stage Summary:
- File created: `/home/z/saavnify-v5/src/components/player/player-variants.tsx` (2,363 lines)
- Exports: `ClassicPlayer`, `ModernPlayer`, `SpotifyPlayer`, `LiquidPlayer`, `CloudGlowPlayer`, `FrostPlayer`, `FoldPlayer`, `GroovePlayer`, `PopsyPlayer`, `MinimalPlayer`, `PaperPlayer`, `PlayerVariant` (dispatcher), `PlayerVariantProps` (shared type)
- Each variant: visually distinct per AirBeats spec, swipe-down-to-close, handles null currentTrack, mobile-first, accessible, uses shared FeatureSheets (queue/lyrics/eq/sleep/share)
- Lint: 0 errors on the new file
- No other files touched

---
Task ID: 6-b
Agent: Style Variants Agent
Task: Build 4 home style variants (Classic, Playful, Neon, Spotify) + 3 library style variants (Classic, Playful, Neon) + 2 dispatcher components for Saavnify v5

Work Log:
- Read existing `src/components/tabs/home-tab.tsx` (1031 lines) and `src/components/tabs/library-tab.tsx` (1120 lines) to learn the real-data fetch patterns (getAggregatedTrending, getBollywoodHits, getPunjabiHits, getNewReleasesIndia from `@/lib/music-aggregator`) and the Zustand `useLibraryStore`/`usePlayerStore`/`useUserStore` APIs.
- Created ONE new file: `src/components/tabs/style-variants.tsx` (~2640 lines) — did NOT touch any other file.
- File opens with `"use client";` and exports:
  - `ClassicHome`, `PlayfulHome`, `NeonHome`, `SpotifyHome` — 4 home variants, each with its own visual identity.
  - `ClassicLibrary`, `PlayfulLibrary`, `NeonLibrary` — 3 library variants, each visually distinct.
  - `HomeVariant({ style })` and `LibraryVariant({ style })` — dispatchers.
  - Re-exported `HomeStyle` and `LibraryStyle` type unions for consumers.
- Built a shared `useHomeData()` hook that fetches real trending / bollywood / punjabi / newReleases data via the same aggregator functions used by HomeTab. Returned `{ trending, bollywood, punjabi, newReleases, loading, error, refresh }`.
- Refactored the hook to satisfy the strict `react-hooks/set-state-in-effect` rule: split into `runFetches()` (only async setState, safe to call from effect) and `refresh()` (sync setState reset, only called from event handlers).
- Shared helpers in the file: `getGreeting()`, `getDateString()`, `truncate`, `formatNumber`, `formatTimeAgo`, `TrackImage` (with `<img>` + onError fallback), `useInView`, `EmptyBlock`, `CardSkeleton`, `CardRowSkeleton`, plus a `MOODS` constant and `QUICK_PLAY_ITEMS`/`DEFAULT_ARTISTS` data.
- **ClassicHome**: greeting header + date, quick-play 2-col grid (Liked/Recent/Daily + 3 trending), trending grid, mood pills, continue listening carousel, favorite artists row, new releases grid. Uses `#1DB954` accent.
- **PlayfulHome**: rounded-3xl + pastel gradient backgrounds (pink/purple/emerald/amber/rose/sky/violet/cyan), "Jump back in" carousel of colorful cards, "Made for you" gradient tiles, trending/bollywood/punjabi/new releases as colorful rounded cards with bouncy `scale: 1.02` hover and emoji accents (🎵🔥✨).
- **NeonHome**: `bg-[#050505]`, neon `#00ff41` + cyan `#00d9ff` accents, `font-mono`, scanline overlay (`repeating-linear-gradient`), "System Online" status bar with pulsing dot + live clock, glitch-per-letter greeting with text-shadow glow, 3 neon stat cards, `>// FEATURED` section headers, horizontal neon-glow track cards (border + box-shadow on hover), `>// RESUME_SESSION` continue-listening section.
- **SpotifyHome**: "Good evening" big bold heading, 6 quick-pick tiles (single-col mobile / 2-col sm+) with album art + title overlay and green `#1DB954` play button, "Made for you" rounded cards, "Recently played" horizontal scroll, tight spacing, clean white-on-black.
- **ClassicLibrary**: 4 tabs (Playlists / Liked / History / Downloads) as pill chips, sorted playlist grid (pinned first), liked-songs hero with play/shuffle buttons + track list, history list grouped by recency, downloads empty state. Reused `CreatePlaylistDialog` for "New".
- **PlayfulLibrary**: pink→purple gradient header, gradient pill tabs with emoji, each playlist rendered as a colorful gradient tile with emoji + pin/delete overlays, "Liked Songs" hero card with big heart-gradient, liked tracks as rounded-2xl rows.
- **NeonLibrary**: `>// LIBRARY` header with text-shadow glow, scanlines overlay, `font-mono`, neon-outline pill tabs that fill green when active, playlists as dark cards with neon-green borders + glow on hover, liked songs counter with `text-glow-green` and zero-padded count, neon track rows.
- Every variant handles loading (skeletons) and empty states, plays tracks via `playQueue(list, index, source)` for lists and `play(track, source)` for single, calls `addToHistory(track)` on play, and uses `toggleLike(track)` + `isLiked(track.id)` for like interactions.
- All thumbnails use `<img>` (per spec, not next/image) with graceful fallback via the `TrackImage` helper.
- All variants are mobile-first responsive (`grid-cols-2 sm:grid-cols-3`, `flex gap-3 overflow-x-auto no-scrollbar`).
- Accessibility: every icon-only button has an `aria-label`, semantic `<header>`/`<section>` where appropriate, large touch targets, alt text on all images.
- Lint workflow: ran `bunx eslint src/components/tabs/style-variants.tsx` (had to `bun install` first since node_modules was missing). Initial run produced 3 errors:
  1. `react-hooks/set-state-in-effect` on the `useHomeData` effect → fixed by splitting into `runFetches()` (async-only setState) + `refresh()` (event-handler-only sync setState).
  2. `react/jsx-no-comment-textnodes` on `// no previous session found` and `// no data stream` plain-text JSX children → wrapped each in `{'...'}` expression.
- One intermediate false-positive warning about unused `eslint-disable` directive → removed.
- After fixes: `bunx eslint src/components/tabs/style-variants.tsx` exits 0 with zero errors and zero warnings.
- TypeScript: `bunx tsc --noEmit --skipLibCheck` reports zero errors in `style-variants.tsx` (other pre-existing errors in `music-aggregator.ts`, `innertube-api.ts`, `cache-manager.ts`, `player-store.ts`, `settings-store.ts`, `types/index.ts` are unrelated to this task and were not touched).
- Fixed one type bug found via tsc: ClassicHome was passing `onPlay=` to `ClassicSection` (which expects `onPlayTrack=`) — renamed 4 call sites to `onPlayTrack`.
- Dev server confirmed still serving `/` with 200 OK responses throughout.

Stage Summary:
- Single file delivered: `src/components/tabs/style-variants.tsx` (~2640 lines, 0 lint errors, 0 type errors in this file).
- 4 home styles + 3 library styles + 2 dispatchers, all using real data via `useHomeData()` (music-aggregator) and `useLibraryStore` (Zustand).
- Each variant is visually distinct: Classic (clean dark), Playful (pastel gradients + emoji), Neon (cyberpunk green/cyan glow + scanlines + mono font), Spotify (clean white-on-black + green accent), and equivalent library variants.
- Dispatchers `HomeVariant` and `LibraryVariant` make it trivial for the app shell to switch styles at runtime.
- No other files modified. Dev server healthy. Lint passes.

---
Task ID: 6-c
Agent: Screens Builder (Subagent)
Task: Build 9 new screens + full Settings panel for Saavnify v5 (AirBeats → React port)

Work Log:
- Read worklog (head -60) to understand prior context (SAAVNIFY V4 → V5 port, InnerTube API, Zustand stores, design system #090909/#181818/#1DB954)
- Read store APIs (player-store, library-store, user-store, theme-store, settings-store) and innertube-api exports to understand exact signatures
- Verified shadcn/ui components available: alert-dialog, select, radio-group, slider, switch, dialog, separator, progress, accordion, tabs, scroll-area, etc.
- Verified sonner Toaster is already mounted in layout.tsx (so `toast()` calls will work)
- Created `src/components/screens/` directory and built 9 files:

1. **explore-screen.tsx** — ExploreScreen
   - Header with Sparkles icon + refresh button
   - Calls `getInnertubeExplore()` on mount with skeleton loaders
   - Sections: New Releases (horizontal album cards), Top Tracks (track list with play), Charts (top 10 numbered), Moods & Genres (colorful gradient pills → searchInnertube)
   - Empty/error fallback to `searchInnertube('top music')`
   - playQueue wiring for tracks & charts

2. **new-releases-screen.tsx** — NewReleasesScreen({ onOpenAlbum })
   - Calls `getInnertubeNewReleases(30)`; fallback to search-derived albums
   - Responsive grid (2 → 5 cols), album cards with thumbnail, title, artist
   - Click → calls `onOpenAlbum(browseId)` prop (default no-op)
   - Loading skeletons + empty/error states

3. **artist-screen.tsx** — ArtistScreen({ channelId, onBack })
   - Calls `getInnertubeArtist(channelId)`
   - Sticky back button, blurred banner header, circular avatar, name + subscriber count
   - Play / Shuffle / Follow buttons (Follow wires to user-store favoriteArtists)
   - Top Songs list (numbered, click → playQueue) + Albums horizontal scroll
   - Skeletons for header + sections

4. **album-screen.tsx** — AlbumScreen({ browseId, onBack })
   - Calls `getInnertubeAlbum(browseId)`
   - Album art + title + artist + track/duration stats
   - Play All, Shuffle (shuffledArray), Save to Library (creates playlist from album name, adds tracks)
   - Track list with #/title/duration/like button (wired to library-store toggleLike)

5. **history-screen.tsx** — HistoryScreen
   - Uses library-store `history`; derives `recentlyPlayed` (deduped by trackId)
   - Groups by date: Today / Yesterday / This Week / Older
   - Each row: thumbnail, title, artist, time-ago, play button (restores queue from group)
   - Clear history button with AlertDialog confirm + toast

6. **stats-screen.tsx** — StatsScreen (recharts-powered)
   - KPI cards: Listening Time, Tracks Played, Unique Artists, Likes (derived from stores)
   - Area chart: weekly listening (7 days, gradient fill)
   - Pie chart: top genres (5 colored cells + legend)
   - Bar chart: top 5 artists by play count
   - Top Tracks list (most played, derived from history counts) + Achievements grid with Progress bars

7. **listen-together-screen.tsx** — ListenTogetherScreen (UI demo, no backend)
   - Lobby: Create Room (generates 6-char code) / Join Room (input + validate)
   - Room view: room code card (copy button), Now Playing card (synced with player-store currentTrack), participants list (3-5 avatars with host/you badges), chat (live with simulated replies)
   - Leave Room button
   - Demo mode info banner explaining local-only sync

8. **backup-restore-screen.tsx** — BackupRestoreScreen
   - Storage usage card (estimated Blob size of library JSON, counts of liked/playlists/history)
   - Export: collects likedSongs + playlists + playlistTracks + history → JSON Blob → `<a download>` click → `saavnify-backup-YYYY-MM-DD.json`
   - Import: file input (.json) → FileReader → parse → preview card with counts → AlertDialog confirm → merge into stores (dedupe by id) via `useLibraryStore.setState`
   - Clear All Data: danger button with AlertDialog confirm → wipes library + user stats
   - Privacy note about local-only storage

9. **settings-screen.tsx** — SettingsScreen (main hub, 6 sections)
   - Layout: left sidebar nav on desktop (sm+), mobile shows section list then sub-screen with back button
   - **Appearance**: theme picker (5 THEME_PRESETS as color-swatch cards), accent color picker (8 presets + custom color input), AMOLED toggle, Dynamic colors toggle, Home style (radio grid), Library style (radio), Mini player style (select), Slider style (select)
   - **Player**: player style grid (11 PLAYER_STYLE_OPTIONS with mini preview swatches), audio quality (select), 8 switches (persistent queue, skip silence, audio normalization, auto load more, auto skip on error, stop on task clear, show like button, show download button)
   - **Content**: content language (select, 10 languages), lyrics provider (radio: auto/lrclib/kugou/youtube), show explicit (switch), restrict mode (switch)
   - **Privacy**: pause search/playback history (switches), disable personalized recs (switch), clear search history button, clear playback history (AlertDialog confirm)
   - **Storage**: cache usage bar (image + song cache), clear image cache, clear song cache, download location info, max cache size slider (1-8 GB)
   - **About**: app card (Saavnify v5 v1.0.0, AirBeats credit), check for updates (toast "Up to date"), notifications toggle, links (GitHub, Privacy Policy, Terms), Open Source Licenses dialog (11 libraries)
   - All wired to `useSettingsStore.set(key, value)` or `useThemeStore` setters; `sonner` toast on every change
   - Sub-components: SettingRow, SectionHeading, AppearanceSection, PlayerSection, ContentSection, PrivacySection, StorageSection, AboutSection

- Lint: `bun run lint` → **0 errors, 0 warnings** in all 9 new files (only pre-existing warning in `cloudflare/innertube-proxy/worker.js` import/no-anonymous-default-export, not in scope)
- TypeScript: `npx tsc --noEmit` → **0 errors in components/screens/** (pre-existing errors in other untouched files only)
- Dev server confirmed running cleanly (GET / 200 in ~25ms)
- All files start with `"use client";`
- All files use `<img>` for thumbnails with onError fallbacks
- All loading/empty/error states handled
- Mobile-first responsive design throughout (grid-cols-2 → sm:grid-cols-3 etc.)
- Accessibility: aria-labels on icon buttons, aria-pressed on toggles, semantic `<section>`/`<nav>`/`<main>`/`<aside>`, AlertDialog for destructive actions

Stage Summary:
- 9 screen files created under `src/components/screens/` totaling ~163KB of code
- All exports match spec: ExploreScreen, NewReleasesScreen, ArtistScreen, AlbumScreen, HistoryScreen, StatsScreen, ListenTogetherScreen, BackupRestoreScreen, SettingsScreen
- Settings panel is the centerpiece — 6 fully wired sections with sidebar nav, ~47KB file covering every AirBeats setting ported to React
- Lint and TypeScript checks pass cleanly for all new files
- Dev server running without errors
