// ============================================================
// SAAVNIFY V4 - Radio Mode Engine
// India-focused endless radio starting from a seed track
// ============================================================

import { unifiedSearch, searchByMood, getRelatedTracks } from '@/lib/music-aggregator';
import type { Track } from '@/types';

// ---- Types ----

export interface RadioState {
  seedTrack: Track | null;
  playedTrackIds: Set<string>;
  currentQueue: Track[];
  searchVariationIndex: number;
}

const radioState: RadioState = {
  seedTrack: null,
  playedTrackIds: new Set(),
  currentQueue: [],
  searchVariationIndex: 0,
};

const radioCache = new Map<string, { data: Track[]; timestamp: number }>();
const RADIO_CACHE_TTL = 20 * 60 * 1000; // 20 minutes

const RADIO_QUEUE_SIZE = 20;

// ---- Search Variations (India-focused) ----

const SEARCH_VARIATIONS = [
  (artist: string, _title: string) => `${artist} songs`,
  (artist: string, _title: string) => `${artist} top songs`,
  (artist: string, _title: string) => `${artist} hits`,
  (artist: string, title: string) => `${extractKeywords(title)} similar songs`,
  (artist: string, _title: string) => `${artist} bollywood`,
  (artist: string, _title: string) => `${artist} playlist`,
  (artist: string, _title: string) => `music like ${artist}`,
  (artist: string, _title: string) => `${artist} best tracks`,
  (artist: string, title: string) => `songs like ${extractKeywords(title)}`,
  (artist: string, _title: string) => `${artist} acoustic`,
  (artist: string, _title: string) => `${artist} live`,
  (artist: string, _title: string) => `${artist} remix`,
];

// ---- Main Radio Functions ----

export async function startRadio(seedTrack: Track): Promise<Track[]> {
  try {
    radioState.seedTrack = seedTrack;
    radioState.playedTrackIds = new Set([seedTrack.videoId]);
    radioState.currentQueue = [];
    radioState.searchVariationIndex = 0;

    const tracks = await generateRadioQueue(seedTrack, RADIO_QUEUE_SIZE);
    radioState.currentQueue = tracks;

    for (const track of tracks) {
      radioState.playedTrackIds.add(track.videoId);
    }

    return [seedTrack, ...tracks];
  } catch (error) {
    console.error('Failed to start radio:', error);
    return [seedTrack];
  }
}

export async function getNextRadioTracks(
  currentTrack: Track,
  playedTracks: Track[] = []
): Promise<Track[]> {
  try {
    for (const track of playedTracks) {
      radioState.playedTrackIds.add(track.videoId);
    }

    const nextTracks = await generateRadioQueue(currentTrack, RADIO_QUEUE_SIZE);

    for (const track of nextTracks) {
      radioState.playedTrackIds.add(track.videoId);
    }

    radioState.currentQueue = nextTracks;
    radioState.searchVariationIndex += 1;

    return nextTracks;
  } catch (error) {
    console.error('Failed to get next radio tracks:', error);
    return [];
  }
}

export async function generateRadioQueue(
  seedTrack: Track,
  count: number = 20
): Promise<Track[]> {
  try {
    const allTracks: Track[] = [];
    const seenVideoIds = new Set<string>([seedTrack.videoId]);

    for (const videoId of radioState.playedTrackIds) {
      seenVideoIds.add(videoId);
    }

    // Strategy 1: Related tracks
    const relatedTracks = await fetchWithCache(
      `related-${seedTrack.videoId}`,
      () => getRelatedTracks(seedTrack, 15)
    );
    for (const track of relatedTracks) {
      if (!seenVideoIds.has(track.videoId)) {
        seenVideoIds.add(track.videoId);
        allTracks.push(track);
      }
    }

    // If we have enough from related tracks, return early
    if (allTracks.length >= count) {
      return shuffleArray(allTracks).slice(0, count);
    }

    // Strategy 2: Search variations (sequential, not parallel)
    const artist = seedTrack.artist || seedTrack.channelTitle;
    const title = seedTrack.title;

    const variationStart = radioState.searchVariationIndex % SEARCH_VARIATIONS.length;
    const variationsToUse = [
      SEARCH_VARIATIONS[variationStart],
      SEARCH_VARIATIONS[(variationStart + 1) % SEARCH_VARIATIONS.length],
    ];

    for (const variation of variationsToUse) {
      if (allTracks.length >= count) break;

      const query = variation(artist, title);
      try {
        const tracks = await fetchWithCache(
          `radio-${query}`,
          () => unifiedSearch(query, 10).then((r) => r.tracks)
        );
        for (const track of tracks) {
          if (!seenVideoIds.has(track.videoId)) {
            seenVideoIds.add(track.videoId);
            allTracks.push(track);
          }
        }
      } catch {
        // Continue
      }
    }

    return shuffleArray(allTracks).slice(0, count);
  } catch (error) {
    console.error('Failed to generate radio queue:', error);
    return [];
  }
}

export function getRadioState(): {
  seedTrack: Track | null;
  playedCount: number;
  queueLength: number;
} {
  return {
    seedTrack: radioState.seedTrack,
    playedCount: radioState.playedTrackIds.size,
    queueLength: radioState.currentQueue.length,
  };
}

export function resetRadio(): void {
  radioState.seedTrack = null;
  radioState.playedTrackIds.clear();
  radioState.currentQueue = [];
  radioState.searchVariationIndex = 0;
}

export function needsRefresh(currentIndex: number, queueLength: number): boolean {
  return queueLength - currentIndex < 3;
}

// ---- Helper Functions ----

async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = radioCache.get(key);
  if (cached && Date.now() - cached.timestamp < RADIO_CACHE_TTL) {
    return cached.data as T;
  }

  const data = await fetcher();

  if (data && Array.isArray(data) && data.length > 0) {
    radioCache.set(key, { data: data as unknown as Track[], timestamp: Date.now() });
  }

  return data;
}

function extractKeywords(title: string): string {
  const stopWords = new Set([
    'official', 'video', 'music', 'song', 'audio', 'lyrics', 'hd',
    'remix', 'full', 'version', 'feat', 'ft', 'the', 'a', 'an',
    'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  ]);

  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return words.slice(0, 3).join(' ');
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
