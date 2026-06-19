// ============================================================
// SAAVNIFY V4 - HTML5 Audio Player
// Handles direct audio stream playback for non-YouTube sources
// JioSaavn, Jamendo, Audius, Internet Archive all use this
// ============================================================

import type { Track } from '@/types';
import { resolveStreamUrl } from '@/lib/music-aggregator';

class AudioPlayerManager {
  private audio: HTMLAudioElement | null = null;
  private currentTimeInterval: ReturnType<typeof setInterval> | null = null;
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private onTimeUpdate: ((time: number, duration: number) => void) | null = null;
  private onEnded: (() => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private onPlayStateChange: ((isPlaying: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.setupAudioEvents();
    }
  }

  private setupAudioEvents(): void {
    if (!this.audio) return;

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.onPlayStateChange?.(false);
      this.onEnded?.();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio player error:', e);
      const error = (e.target as HTMLAudioElement)?.error;
      let message = 'Playback failed';
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = 'Playback aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = 'Network error - check your connection';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = 'Audio decode error - trying another source';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Audio source not supported';
            break;
        }
      }
      this.onError?.(message);
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.onPlayStateChange?.(true);
      this.startTimeUpdate();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.onPlayStateChange?.(false);
      this.stopTimeUpdate();
    });

    // MediaSession integration for lock screen controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    }
  }

  private startTimeUpdate(): void {
    this.stopTimeUpdate();
    this.currentTimeInterval = setInterval(() => {
      if (this.audio && !this.audio.paused) {
        this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
      }
    }, 500);
  }

  private stopTimeUpdate(): void {
    if (this.currentTimeInterval) {
      clearInterval(this.currentTimeInterval);
      this.currentTimeInterval = null;
    }
  }

  /**
   * Load and play a track.
   * Resolves the stream URL from the aggregator if needed.
   * For YouTube/InnerTube tracks, the aggregator now returns a
   * direct audio URL (no IFrame needed) so the HTML5 Audio player
   * can handle them too.
   */
  async playTrack(track: Track): Promise<boolean> {
    if (!this.audio) return false;

    try {
      // Resolve stream URL
      let streamUrl: string | null | undefined = track.streamUrl;

      if (!streamUrl) {
        streamUrl = await resolveStreamUrl(track);
      }

      if (!streamUrl) {
        // No stream URL available - this track needs YouTube IFrame player
        return false;
      }

      this.currentTrack = track;
      this.audio.src = streamUrl;

      // Set MediaSession metadata
      this.updateMediaSession(track);

      try {
        await this.audio.play();
        this.isPlaying = true;
        return true;
      } catch (playError) {
        console.error('Audio play() failed:', playError);
        // Autoplay might be blocked
        return false;
      }
    } catch (error) {
      console.error('Failed to play track:', error);
      return false;
    }
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  resume(): void {
    if (this.audio && this.audio.paused && this.audio.src) {
      this.audio.play().catch(console.error);
    }
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  mute(): void {
    if (this.audio) {
      this.audio.muted = true;
    }
  }

  unmute(): void {
    if (this.audio) {
      this.audio.muted = false;
    }
  }

  isMuted(): boolean {
    return this.audio?.muted ?? false;
  }

  getCurrentTime(): number {
    return this.audio?.currentTime ?? 0;
  }

  getDuration(): number {
    return this.audio?.duration ?? 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.currentTrack = null;
      this.isPlaying = false;
      this.stopTimeUpdate();
    }
  }

  private updateMediaSession(track: Track): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || track.channelTitle,
        artwork: track.thumbnail
          ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    } catch {
      // MediaSession not supported
    }
  }

  // ---- Event Setters ----

  setOnTimeUpdate(callback: (time: number, duration: number) => void): void {
    this.onTimeUpdate = callback;
  }

  setOnEnded(callback: () => void): void {
    this.onEnded = callback;
  }

  setOnError(callback: (error: string) => void): void {
    this.onError = callback;
  }

  setOnPlayStateChange(callback: (isPlaying: boolean) => void): void {
    this.onPlayStateChange = callback;
  }

  destroy(): void {
    this.stop();
    this.audio = null;
  }
}

// Singleton instance
let audioPlayerInstance: AudioPlayerManager | null = null;

export function getAudioPlayer(): AudioPlayerManager {
  if (!audioPlayerInstance) {
    audioPlayerInstance = new AudioPlayerManager();
  }
  return audioPlayerInstance;
}

/**
 * Check if a track should be played using the HTML5 Audio player
 * (as opposed to YouTube IFrame Player).
 *
 * After the InnerTube integration, YouTube tracks ALSO use HTML5 Audio
 * because the aggregator returns a direct audio URL via the InnerTube
 * /player endpoint. The IFrame player is now only a last-resort
 * fallback when audio playback fails (handled in youtube-player.tsx).
 */
export function shouldUseAudioPlayer(track: Track): boolean {
  // All tracks should try the HTML5 Audio player first.
  // The audio player's playTrack() will return false if it can't
  // resolve a stream URL, at which point youtube-player.tsx falls
  // back to the IFrame player for tracks that have a videoId.
  return true;
}
