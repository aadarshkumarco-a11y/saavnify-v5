# InnerTube API Integration — Setup Guide

This document explains the new InnerTube-based music source that replaces
the broken YouTube Data API v3 path, and walks you through deploying the
required Cloudflare Worker proxy.

---

## Why this change was needed

The previous setup had three problems:

1. **`src/lib/youtube-api.ts`** used the **YouTube Data API v3** which:
   - Requires every user to bring their own API key
   - Has a 10,000 quota-unit daily limit (a single search burns 100 units)
   - **Does NOT return stream URLs** — only metadata, so playback had to
     fall back to the YouTube IFrame Player (slow, no background play on
     mobile, privacy-invasive)

2. **Piped API instances** are frequently down, leaving only JioSaavn
   (Bollywood-only) as a fallback for non-Indian music.

3. **YouTube tracks couldn't be played via HTML5 Audio** — only via the
   IFrame player, which is restricted on mobile.

## What changed

A new module `src/lib/sources/innertube-api.ts` ports AirBeats' Kotlin
`innertube/` module to TypeScript. It uses YouTube's **private InnerTube
API** via the **`ANDROID_VR` client** — which:
- Requires no auth (no cookies, no SAPISIDHASH, no poToken)
- Returns direct audio stream URLs (no signature cipher for this client)
- Works with HTML5 Audio (background-playable, faster than IFrame)

The aggregator (`music-aggregator.ts`) now tries sources in this order:

```
InnerTube → Piped → Local Cache → JioSaavn
```

`resolveStreamUrl()` now resolves direct audio URLs for YouTube tracks
via InnerTube's `/player` endpoint, so they play through HTML5 Audio
instead of forcing the IFrame player. The IFrame player is kept only as
a last-resort fallback.

---

## Files changed

| File | Change |
|---|---|
| `src/lib/sources/innertube-api.ts` | **NEW** — InnerTube client (TS port of AirBeats' `innertube/` module) |
| `src/lib/music-aggregator.ts` | Added InnerTube as primary source for search/trending/mood/stream resolution |
| `src/lib/sources/audio-player.ts` | `shouldUseAudioPlayer()` now returns `true` for all tracks (YouTube included) because InnerTube gives us direct audio URLs |
| `src/components/player/youtube-player.tsx` | Added proper fallback: if HTML5 Audio fails, switch to IFrame player (instead of silently warning) |
| `src/components/library/playlist-detail-view.tsx` | Migrated "Add track to playlist" search from Data API v3 to unified aggregator |
| `cloudflare/innertube-proxy/` | **NEW** — Cloudflare Worker that proxies browser requests to `music.youtube.com/youtubei/v1/*` with CORS headers |

---

## Deploy the Cloudflare Worker (REQUIRED)

Browsers cannot POST to `music.youtube.com` directly due to CORS. You
**must** deploy the included Cloudflare Worker proxy. The free tier
(100,000 requests/day) is more than enough for personal use.

### Steps

1. **Install wrangler** (Cloudflare's CLI):
   ```bash
   npm install -g wrangler
   # or: bun add -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Deploy the worker**:
   ```bash
   cd cloudflare/innertube-proxy
   wrangler deploy
   ```

4. **Copy the worker URL** — wrangler will print something like:
   ```
   Published saavnify-innertube (1.23 sec)
     https://saavnify-innertube.<your-sub>.workers.dev
   ```

5. **Configure the app to use your worker URL**. You have two options:

   **Option A — Edit the default** (simplest):
   Open `src/lib/sources/innertube-api.ts` and change:
   ```ts
   let PROXY_BASE = 'https://saavnify-innertube.workers.dev';
   ```
   to your actual worker URL.

   **Option B — Set at runtime** (recommended for production):
   In `src/app/layout.tsx` (or any client entry point), add:
   ```ts
   import { setInnertubeProxyUrl } from '@/lib/sources/innertube-api';
   setInnertubeProxyUrl('https://saavnify-innertube.<your-sub>.workers.dev');
   ```

---

## How the InnerTube client works (quick reference)

```
User taps song
   │
   ▼
resolveStreamUrl(track)  [music-aggregator.ts]
   │
   ▼
getInnertubeStreamUrl(videoId)  [innertube-api.ts]
   │
   ▼
POST https://<worker>.workers.dev/player
   Body: {
     videoId,
     context: { client: { clientName: "ANDROID_VR", clientVersion: "1.61.48", ... } },
     playbackContext: { contentPlaybackContext: { signatureTimestamp: 0 } },
     contentCheckOk: true,
     racyCheckOk: true
   }
   │
   ▼
Worker forwards to https://music.youtube.com/youtubei/v1/player
   │
   ▼
Response: { streamingData: { adaptiveFormats: [{ url, mimeType, bitrate, ... }] } }
   │
   ▼
Client picks highest-bitrate audio/mp4 stream URL
   │
   ▼
HTML5 Audio plays it directly (no IFrame, no YouTube login)
```

---

## Testing the integration

After deploying the worker:

1. Start the dev server: `bun run dev`
2. Open the app and search for any song (e.g. "Shape of Ed Sheeran")
3. Tap a result — it should play through HTML5 Audio (check DevTools →
   Network tab → you should see a `googlevideo.com` audio URL being
   streamed, not an IFrame request)
4. Search for non-Indian content (e.g. "Taylor Swift") — should now work
   even when Piped is down

If you see CORS errors in the console, double-check that your worker URL
is correct and the worker is deployed.

---

## Rollback

To revert to the previous behaviour:

1. In `src/lib/sources/audio-player.ts`, restore `shouldUseAudioPlayer`
   to its original logic (return `false` for `yt-` prefixed IDs).
2. In `src/lib/music-aggregator.ts`, remove the `innertube` blocks from
   `unifiedSearch`, `refreshTrendingInBackground`, `searchByMood`, and
   `resolveStreamUrl`.
3. Delete `src/lib/sources/innertube-api.ts` and `cloudflare/innertube-proxy/`.

The legacy `src/lib/youtube-api.ts` (Data API v3) is left untouched so
that `formatDuration` / `formatViewCount` utilities keep working.

---

## Security & ToS notes

- The Cloudflare Worker strips `Cookie`, `Origin`, `Referer` headers
  before forwarding to YouTube, so no user identity leaks.
- The worker only allows a hardcoded allowlist of InnerTube endpoints.
- The `ALLOWED_ORIGINS` set in the worker restricts which sites can call
  it — populate this with your production domain before going live.
- Using InnerTube is against YouTube's Terms of Service but is widely
  used by open-source music clients (InnerTune, ViMusic, RiMusic, etc.).
  Use at your own discretion.
