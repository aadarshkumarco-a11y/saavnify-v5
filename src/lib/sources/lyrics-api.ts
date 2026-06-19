// Multi-source lyrics provider — ported from AirBeats lyrics system.
// Sources: lrclib (synced), KuGou (synced), YouTube subtitles (fallback).
// Returns either synced (LRC time-tagged) or plain text lyrics.

import type { Track } from '@/types';

export interface LyricLine {
  time: number; // seconds (0 = unsynced/plain)
  text: string;
}

export interface LyricsResult {
  synced: boolean;
  lines: LyricLine[];
  source: 'lrclib' | 'kugou' | 'youtube' | 'none';
  plain?: string;
}

// ---------------------------------------------------------------------------
// LRC parser — converts "[mm:ss.xx]text" format to LyricLine[]
// ---------------------------------------------------------------------------
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;
  for (const raw of lrc.split('\n')) {
    const times: number[] = [];
    let match: RegExpExecArray | null;
    timeRegex.lastIndex = 0;
    let lastEnd = 0;
    while ((match = timeRegex.exec(raw)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      times.push(min * 60 + sec + ms / 1000);
      lastEnd = match.index + match[0].length;
    }
    const text = raw.slice(lastEnd).trim();
    if (times.length === 0) continue;
    for (const t of times) lines.push({ time: t, text });
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

// ---------------------------------------------------------------------------
// lrclib.net — free, public, no API key
// ---------------------------------------------------------------------------
async function fetchLrclib(track: Track): Promise<LyricsResult | null> {
  try {
    const params = new URLSearchParams();
    params.set('track_name', track.title);
    params.set('artist_name', track.artist);
    const url = `https://lrclib.net/api/get?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.syncedLyrics) {
      return { synced: true, lines: parseLRC(data.syncedLyrics), source: 'lrclib' };
    }
    if (data.plainLyrics) {
      return {
        synced: false,
        lines: data.plainLyrics.split('\n').map((t: string) => ({ time: 0, text: t })),
        source: 'lrclib',
        plain: data.plainLyrics,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// KuGou — search by keyword, then fetch synced lyrics
// ---------------------------------------------------------------------------
async function fetchKugou(track: Track): Promise<LyricsResult | null> {
  try {
    const keyword = encodeURIComponent(`${track.artist} ${track.title}`);
    const searchUrl = `https://krcs.kugou.com/search?ver=1&man=yes&client=mobi&hash=&src_app=&duration=${track.duration}&keyword=${keyword}`;
    const sres = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    if (!sres.ok) return null;
    const sdata = await sres.json();
    const candidates = sdata?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    const c = candidates[0];
    const id = c.id;
    const accesskey = c.accesskey;
    const downUrl = `https://lyrics.kugou.com/download?ver=1&client=pc&id=${id}&accesskey=${accesskey}&fmt=lrc&charset=utf8`;
    const dres = await fetch(downUrl, { signal: AbortSignal.timeout(6000) });
    if (!dres.ok) return null;
    const ddata = await dres.json();
    if (ddata?.content) {
      const lrc = atob(ddata.content);
      const lines = parseLRC(lrc);
      if (lines.length) return { synced: true, lines, source: 'kugou' };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// YouTube subtitles — fetch via the caption tracks (best-effort)
// ---------------------------------------------------------------------------
async function fetchYouTubeSubtitles(track: Track): Promise<LyricsResult | null> {
  try {
    if (!track.videoId) return null;
    // Use a public captions proxy (no API key) — best-effort, may fail.
    const url = `https://video.google.com/timedtext?lang=en&v=${track.videoId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const xml = await res.text();
    if (!xml) return null;
    const textMatches = xml.match(/<text[^>]*>([^<]+)<\/text>/g) || [];
    const lines: LyricLine[] = textMatches.map((m) => {
      const startMatch = m.match(/start="([\d.]+)"/);
      const textMatch = m.match(/>(([^<]+))</);
      const time = startMatch ? parseFloat(startMatch[1]) : 0;
      const text = textMatch ? decodeURIComponent(textMatch[2]) : '';
      return { time, text };
    });
    if (!lines.length) return null;
    return { synced: true, lines, source: 'youtube' };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main entry — try providers based on preference, fall back through chain
// ---------------------------------------------------------------------------
export async function fetchLyrics(
  track: Track,
  provider: 'lrclib' | 'kugou' | 'youtube' | 'auto' = 'auto'
): Promise<LyricsResult> {
  const chain: Array<'lrclib' | 'kugou' | 'youtube'> =
    provider === 'auto'
      ? ['lrclib', 'kugou', 'youtube']
      : [provider, ...(provider === 'lrclib' ? ['kugou', 'youtube'] : provider === 'kugou' ? ['lrclib', 'youtube'] : ['lrclib', 'kugou'])];

  for (const p of chain) {
    const result =
      p === 'lrclib' ? await fetchLrclib(track) : p === 'kugou' ? await fetchKugou(track) : await fetchYouTubeSubtitles(track);
    if (result) return result;
  }

  return { synced: false, lines: [], source: 'none' };
}

// Find the active lyric line index for a given playback time
export function findActiveLyricIndex(lines: LyricLine[], time: number): number {
  if (!lines.length) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
