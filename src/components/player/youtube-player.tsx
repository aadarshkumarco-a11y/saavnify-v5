'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { getAudioPlayer, shouldUseAudioPlayer } from '@/lib/sources/audio-player';
import type { Track } from '@/types';

// YouTube IFrame Player API type declarations
interface YTPlayer {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getVolume: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
}

interface YTEvent {
  data: number;
  target: YTPlayer;
}

interface YTPlayerConstructor {
  new (containerId: string | HTMLElement, options: YTPlayerOptions): YTPlayer;
}

interface YTPlayerOptions {
  videoId?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: YTEvent) => void;
    onPlaybackQualityChange?: (event: YTEvent) => void;
    onError?: (event: YTEvent) => void;
  };
}

declare global {
  interface Window {
    YT: {
      Player: YTPlayerConstructor;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

// YouTube Player State constants
const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export function YouTubePlayer() {
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingVideoIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const prevTrackIdRef = useRef<string | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof getAudioPlayer> | null>(null);
  const activePlayerRef = useRef<'youtube' | 'audio'>('youtube');

  // Subscribe to store values needed for reactivity
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);

  const startTimeUpdate = () => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
    }
    timeIntervalRef.current = setInterval(() => {
      if (activePlayerRef.current === 'youtube' && playerRef.current) {
        try {
          const t = playerRef.current.getCurrentTime();
          const d = playerRef.current.getDuration();
          if (typeof t === 'number' && !isNaN(t)) {
            usePlayerStore.getState().setCurrentTime(t);
          }
          if (typeof d === 'number' && !isNaN(d) && d > 0) {
            usePlayerStore.getState().setDuration(d);
          }
        } catch {
          // Player might be destroyed
        }
      }
      // Audio player updates are handled by its own event system
    }, 500);
  };

  const stopTimeUpdate = () => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
  };

  // ---- Initialize HTML5 Audio Player ----

  useEffect(() => {
    const audioPlayer = getAudioPlayer();
    audioPlayerRef.current = audioPlayer;

    // Set up audio player callbacks
    audioPlayer.setOnTimeUpdate((time, duration) => {
      usePlayerStore.getState().setCurrentTime(time);
      if (duration > 0) {
        usePlayerStore.getState().setDuration(duration);
      }
    });

    audioPlayer.setOnEnded(() => {
      usePlayerStore.getState().next();
    });

    audioPlayer.setOnError((error) => {
      console.error('Audio player error:', error);
      // Try next track on error
      usePlayerStore.getState().next();
    });

    return () => {
      audioPlayer.stop();
    };
  }, []);

  // ---- Initialize YouTube IFrame API ----

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const onPlayerReady = (event: { target: YTPlayer }) => {
      playerRef.current = event.target;

      try {
        const state = usePlayerStore.getState();
        event.target.setVolume(Math.round(state.volume * 100));
        if (state.muted) {
          event.target.mute();
        }
      } catch {
        // ignore
      }

      if (pendingVideoIdRef.current) {
        event.target.loadVideoById(pendingVideoIdRef.current);
        pendingVideoIdRef.current = null;
      }
    };

    const onPlayerStateChange = (event: YTEvent) => {
      if (activePlayerRef.current !== 'youtube') return;

      switch (event.data) {
        case YT_STATE.PLAYING:
          startTimeUpdate();
          break;
        case YT_STATE.PAUSED:
          stopTimeUpdate();
          break;
        case YT_STATE.ENDED:
          stopTimeUpdate();
          if (usePlayerStore.getState().repeat === 'one') {
            try {
              event.target.seekTo(0, true);
              event.target.playVideo();
            } catch {
              // ignore
            }
          } else {
            usePlayerStore.getState().next();
          }
          break;
        default:
          break;
      }
    };

    const onPlayerError = (event: YTEvent) => {
      console.error('YouTube Player Error:', event.data);
      if (event.data === 100 || event.data === 101 || event.data === 150) {
        usePlayerStore.getState().next();
      }
    };

    const initPlayer = () => {
      if (!containerRef.current) return;

      try {
        playerRef.current = new window.YT.Player('yt-player-container', {
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            playsinline: 1,
            origin: window.location.origin || 'https://localhost',
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError,
          },
        });
      } catch (err) {
        console.error('Failed to create YouTube player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
      if (previousCallback) previousCallback();
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      stopTimeUpdate();
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, []);

  // ---- Handle Track Changes ----

  useEffect(() => {
    if (!currentTrack) {
      prevTrackIdRef.current = null;
      return;
    }

    const trackChanged = prevTrackIdRef.current !== currentTrack.id;
    prevTrackIdRef.current = currentTrack.id;

    if (!trackChanged) {
      // Same track - just toggle play/pause
      if (shouldUseAudioPlayer(currentTrack)) {
        if (activePlayerRef.current === 'audio' && audioPlayerRef.current) {
          if (isPlaying) {
            audioPlayerRef.current.resume();
          } else {
            audioPlayerRef.current.pause();
          }
        }
      } else {
        if (playerRef.current) {
          try {
            const playerState = playerRef.current.getPlayerState();
            if (isPlaying && playerState !== YT_STATE.PLAYING && playerState !== YT_STATE.BUFFERING) {
              playerRef.current.playVideo();
            } else if (!isPlaying && playerState === YT_STATE.PLAYING) {
              playerRef.current.pauseVideo();
            }
          } catch {
            pendingVideoIdRef.current = currentTrack.videoId;
          }
        }
      }
      return;
    }

    // New track - determine which player to use.
    // After the InnerTube integration, ALL tracks try the HTML5 Audio
    // player first (because InnerTube resolves direct stream URLs for
    // YouTube content). The IFrame player is only used as a fallback
    // when audio resolution fails.
    const useAudio = shouldUseAudioPlayer(currentTrack);

    if (useAudio) {
      // Switch to HTML5 Audio player
      // Pause YouTube player if it was playing
      if (activePlayerRef.current === 'youtube' && playerRef.current) {
        try { playerRef.current.pauseVideo(); } catch { /* ignore */ }
      }

      activePlayerRef.current = 'audio';
      stopTimeUpdate();

      if (audioPlayerRef.current) {
        // Set volume/mute
        audioPlayerRef.current.setVolume(volume);
        if (muted) audioPlayerRef.current.mute();
        else audioPlayerRef.current.unmute();

        // Play the track
        audioPlayerRef.current.playTrack(currentTrack).then((success) => {
          if (!success) {
            // Audio player failed to resolve a stream URL.
            // Fall back to YouTube IFrame player IF this track has a videoId
            // (which all InnerTube/Piped/YouTube-sourced tracks do).
            if (currentTrack.videoId && playerRef.current) {
              console.warn('Audio resolution failed, falling back to YouTube IFrame');
              activePlayerRef.current = 'youtube';
              try {
                playerRef.current.loadVideoById(currentTrack.videoId, 0);
              } catch {
                pendingVideoIdRef.current = currentTrack.videoId;
              }
            } else {
              // No fallback available — skip to next track
              console.warn('Audio failed and no YouTube fallback available');
              usePlayerStore.getState().next();
            }
          }
        });
      }
    } else {
      // Direct IFrame player path (kept for backward compat)
      if (activePlayerRef.current === 'audio' && audioPlayerRef.current) {
        audioPlayerRef.current.stop();
      }

      activePlayerRef.current = 'youtube';

      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById(currentTrack.videoId, 0);
        } catch {
          pendingVideoIdRef.current = currentTrack.videoId;
        }
      } else {
        pendingVideoIdRef.current = currentTrack.videoId;
      }
    }
  }, [currentTrack, isPlaying]);

  // ---- Handle Volume Changes ----

  useEffect(() => {
    if (activePlayerRef.current === 'audio' && audioPlayerRef.current) {
      audioPlayerRef.current.setVolume(volume);
    } else if (playerRef.current) {
      try { playerRef.current.setVolume(Math.round(volume * 100)); } catch { /* ignore */ }
    }
  }, [volume]);

  // ---- Handle Mute Changes ----

  useEffect(() => {
    if (activePlayerRef.current === 'audio' && audioPlayerRef.current) {
      if (muted) audioPlayerRef.current.mute();
      else audioPlayerRef.current.unmute();
    } else if (playerRef.current) {
      try {
        if (muted) playerRef.current.mute();
        else playerRef.current.unMute();
      } catch { /* ignore */ }
    }
  }, [muted]);

  // ---- MediaSession API ----

  useEffect(() => {
    if (!currentTrack || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || currentTrack.channelTitle,
        artwork: currentTrack.thumbnail
          ? [{ src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        usePlayerStore.getState().resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        usePlayerStore.getState().pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        usePlayerStore.getState().previous();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        usePlayerStore.getState().next();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          const store = usePlayerStore.getState();
          store.seek(details.seekTime);
          // Also seek in the active player
          if (activePlayerRef.current === 'audio' && audioPlayerRef.current) {
            audioPlayerRef.current.seek(details.seekTime);
          } else if (playerRef.current) {
            try { playerRef.current.seekTo(details.seekTime, true); } catch { /* ignore */ }
          }
        }
      });
    } catch {
      // MediaSession not supported
    }
  }, [currentTrack]);

  return (
    <div
      ref={containerRef}
      className="fixed w-0 h-0 overflow-hidden pointer-events-none"
      style={{ top: '-9999px', left: '-9999px' }}
      aria-hidden="true"
    >
      <div id="yt-player-container" />
    </div>
  );
}
