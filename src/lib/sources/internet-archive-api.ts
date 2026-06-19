// ============================================================
// SAAVNIFY V4 - Internet Archive Audio Integration
// Tertiary fallback source - free, public domain audio
// ============================================================

import type { Track, SourceType } from '@/types';

const SOURCE: SourceType = 'archive';
const ARCHIVE_API = 'https://archive.org/advancedsearch.php';
const ARCHIVE_METADATA = 'https://archive.org/metadata';

interface ArchiveSearchResult {
  responseHeader: { status: number };
  response: {
    numFound: number;
    docs: ArchiveDoc[];
  };
}

interface ArchiveDoc {
  identifier: string;
  title: string;
  creator?: string;
  description?: string;
  avg_rating?: number;
  num_reviews?: number;
  downloads?: number;
  year?: string;
  subject?: string[];
}

interface ArchiveMetadata {
  metadata: {
    title: string;
    creator?: string;
  };
  files: ArchiveFile[];
}

interface ArchiveFile {
  name: string;
  format: string;
  source: string;
  size?: string;
  length?: string;
}

// ---- Helper: Map Archive doc to Track ----

function mapArchiveDocToTrack(doc: ArchiveDoc, audioUrl?: string): Track {
  return {
    id: `ia-${doc.identifier}`,
    videoId: doc.identifier,
    title: doc.title || 'Unknown Title',
    artist: doc.creator || 'Unknown Artist',
    thumbnail: `https://archive.org/services/img/${doc.identifier}`,
    duration: 0,
    channelTitle: doc.creator || 'Internet Archive',
    addedAt: Date.now(),
    source: SOURCE,
    streamUrl: audioUrl || `https://archive.org/download/${doc.identifier}/${doc.identifier}_vbr.mp3`,
    year: doc.year,
  };
}

// ---- Search Internet Archive ----

export async function searchInternetArchive(query: string, limit: number = 15): Promise<Track[]> {
  try {
    const url = new URL(ARCHIVE_API);
    url.searchParams.set('q', `${query} AND mediatype:audio AND collection:(audio_music OR audio)`);
    url.searchParams.set('fl', 'identifier,title,creator,avg_rating,downloads,year,subject');
    url.searchParams.set('sort', 'downloads desc');
    url.searchParams.set('rows', String(limit));
    url.searchParams.set('output', 'json');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data: ArchiveSearchResult = await response.json();

    if (!data.response?.docs) return [];

    return data.response.docs.map((doc) => mapArchiveDocToTrack(doc));
  } catch (error) {
    console.error('Internet Archive search failed:', error);
    return [];
  }
}

// ---- Get Audio Stream URL for an Archive Item ----

export async function getArchiveStreamUrl(identifier: string): Promise<string | null> {
  try {
    const url = `${ARCHIVE_METADATA}/${identifier}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data: ArchiveMetadata = await response.json();

    // Find the best audio file (prefer VBR MP3, then any MP3, then OGG)
    const audioFormats = ['VBR MP3', 'MP3', 'OGG Vorbis', 'Ogg Vorbis', 'WAVE'];
    for (const format of audioFormats) {
      const file = data.files?.find(
        (f) => f.format === format && f.source === 'original'
      );
      if (file) {
        return `https://archive.org/download/${identifier}/${encodeURIComponent(file.name)}`;
      }
    }

    // Fallback: find any MP3 file
    const mp3File = data.files?.find(
      (f) => (f.format?.includes('MP3') || f.name?.endsWith('.mp3'))
    );
    if (mp3File) {
      return `https://archive.org/download/${identifier}/${encodeURIComponent(mp3File.name)}`;
    }

    // Last resort: try the common pattern
    return `https://archive.org/download/${identifier}/${identifier}_vbr.mp3`;
  } catch (error) {
    console.error('Internet Archive stream URL failed:', error);
    return null;
  }
}

// ---- Get Popular Archive Audio ----

export async function getArchivePopular(limit: number = 15): Promise<Track[]> {
  try {
    const url = new URL(ARCHIVE_API);
    url.searchParams.set('q', 'mediatype:audio AND collection:audio_music');
    url.searchParams.set('fl', 'identifier,title,creator,avg_rating,downloads,year');
    url.searchParams.set('sort', 'downloads desc');
    url.searchParams.set('rows', String(limit));
    url.searchParams.set('output', 'json');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data: ArchiveSearchResult = await response.json();
    return (data.response?.docs || []).map((doc) => mapArchiveDocToTrack(doc));
  } catch (error) {
    console.error('Internet Archive popular failed:', error);
    return [];
  }
}

// ---- Health Check ----

export async function isArchiveAvailable(): Promise<boolean> {
  try {
    const url = new URL(ARCHIVE_API);
    url.searchParams.set('q', 'mediatype:audio');
    url.searchParams.set('rows', '1');
    url.searchParams.set('output', 'json');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
