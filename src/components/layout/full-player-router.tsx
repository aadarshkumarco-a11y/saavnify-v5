'use client';

import { useSettingsStore } from '@/stores/settings-store';
import { FullPlayer } from './full-player';
import { PlayerVariant } from '@/components/player/player-variants';

interface FullPlayerRouterProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Routes the full-screen player to the correct variant based on the
 * user's `playerStyle` setting. The 'classic' style uses the original
 * FullPlayer component; all other 10 styles use the PlayerVariant
 * dispatcher (which itself switches on style).
 */
export function FullPlayerRouter({ isOpen, onClose }: FullPlayerRouterProps) {
  const playerStyle = useSettingsStore((s) => s.playerStyle);

  if (playerStyle === 'classic') {
    return <FullPlayer isOpen={isOpen} onClose={onClose} />;
  }

  return <PlayerVariant style={playerStyle} isOpen={isOpen} onClose={onClose} />;
}
