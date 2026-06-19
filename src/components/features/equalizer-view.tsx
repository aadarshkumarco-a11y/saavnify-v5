'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

interface EqualizerViewProps {
  open: boolean;
  onClose: () => void;
}

interface EQBand {
  frequency: string;
  label: string;
  value: number; // -12 to +12
}

interface EQPreset {
  name: string;
  bands: number[];
}

const PRESETS: EQPreset[] = [
  { name: 'Normal', bands: [0, 0, 0, 0, 0] },
  { name: 'Pop', bands: [1, 3, 5, 3, 1] },
  { name: 'Rock', bands: [5, 3, -1, 2, 4] },
  { name: 'Jazz', bands: [3, 1, -1, 1, 3] },
  { name: 'Classical', bands: [4, 2, 0, 2, 4] },
  { name: 'Bass Boost', bands: [8, 5, 0, 0, 0] },
  { name: 'Custom', bands: [0, 0, 0, 0, 0] },
];

const BANDS: { frequency: string; label: string }[] = [
  { frequency: '60Hz', label: '60' },
  { frequency: '230Hz', label: '230' },
  { frequency: '910Hz', label: '910' },
  { frequency: '4kHz', label: '4k' },
  { frequency: '14kHz', label: '14k' },
];

const STORAGE_KEY = 'saavnify-eq-settings';

interface EQSettings {
  preset: string;
  bands: number[];
  bassBoost: boolean;
  virtualizer: boolean;
  loudnessEnhancer: boolean;
}

function loadSettings(): EQSettings {
  if (typeof window === 'undefined') {
    return { preset: 'Normal', bands: [0, 0, 0, 0, 0], bassBoost: false, virtualizer: false, loudnessEnhancer: false };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return { preset: 'Normal', bands: [0, 0, 0, 0, 0], bassBoost: false, virtualizer: false, loudnessEnhancer: false };
}

function saveSettings(settings: EQSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function EqualizerView({ open, onClose }: EqualizerViewProps) {
  const [settings, setSettings] = useState<EQSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handlePresetSelect = useCallback((preset: EQPreset) => {
    setSettings((prev) => ({
      ...prev,
      preset: preset.name,
      bands: preset.name === 'Custom' ? prev.bands : [...preset.bands],
    }));
  }, []);

  const handleBandChange = useCallback((index: number, value: number) => {
    setSettings((prev) => {
      const newBands = [...prev.bands];
      newBands[index] = value;
      return { ...prev, preset: 'Custom', bands: newBands };
    });
  }, []);

  const handleToggle = useCallback((key: 'bassBoost' | 'virtualizer' | 'loudnessEnhancer') => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleReset = useCallback(() => {
    setSettings({
      preset: 'Normal',
      bands: [0, 0, 0, 0, 0],
      bassBoost: false,
      virtualizer: false,
      loudnessEnhancer: false,
    });
  }, []);

  // Generate frequency response curve points
  const curvePoints = settings.bands.map((band, i) => ({
    x: i,
    y: band,
  }));

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[#121212] border-[#282828] rounded-t-2xl h-[75vh] max-h-[75vh] p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-[#282828]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[#1DB954]" />
              <SheetTitle className="text-white text-lg font-bold">Equalizer</SheetTitle>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-white/40 text-xs hover:text-white/70 transition-colors"
              aria-label="Reset equalizer"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
          <SheetDescription className="sr-only">Adjust audio equalizer settings</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6" style={{ scrollbarWidth: 'none' }}>
          {/* Presets */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-3">Presets</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200
                    ${
                      settings.preset === preset.name
                        ? 'bg-[#1DB954] text-[#090909]'
                        : 'bg-[#282828] text-white/60 hover:bg-[#333] hover:text-white/80'
                    }
                  `}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency Response Visualization */}
          <div className="bg-[#181818] rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-3">Frequency Response</p>
            <div className="h-32 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[-12, -6, 0, 6, 12].map((db) => (
                  <div key={db} className="flex items-center">
                    <span className="text-[9px] text-white/20 w-6 text-right mr-2">{db}dB</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                ))}
              </div>

              {/* 0dB reference line */}
              <div className="absolute left-8 right-0 top-1/2 h-px bg-white/10" />

              {/* Curve */}
              <svg className="absolute left-8 right-0 top-0 bottom-0" viewBox="0 0 4 24" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1DB954" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#1DB954" stopOpacity="0" />
                    <stop offset="100%" stopColor="#1DB954" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                {/* Fill area */}
                <path
                  d={(() => {
                    const points = curvePoints.map((p, i) => {
                      const x = i;
                      const y = 12 - p.y; // Invert: +12dB is at top
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    });
                    const lastX = 4;
                    const fillPath = points + ` L ${lastX} 12 L 0 12 Z`;
                    return fillPath;
                  })()}
                  fill="url(#eqGradient)"
                />
                {/* Line */}
                <path
                  d={(() => {
                    return curvePoints
                      .map((p, i) => {
                        const x = i;
                        const y = 12 - p.y;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ');
                  })()}
                  fill="none"
                  stroke="#1DB954"
                  strokeWidth="0.15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dots */}
                {curvePoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={i}
                    cy={12 - p.y}
                    r="0.25"
                    fill="#1DB954"
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* 5-Band Vertical Sliders */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-4">Bands</p>
            <div className="flex justify-between items-center gap-2 px-2">
              {BANDS.map((band, index) => (
                <div key={band.frequency} className="flex flex-col items-center gap-2 flex-1">
                  {/* dB value display */}
                  <span className="text-xs font-mono text-[#1DB954] tabular-nums h-4">
                    {settings.bands[index] > 0 ? '+' : ''}
                    {settings.bands[index]}
                  </span>

                  {/* Vertical slider */}
                  <div className="relative h-40 w-8 flex items-center justify-center">
                    {/* Track background */}
                    <div className="absolute w-1 h-full bg-[#282828] rounded-full" />

                    {/* 0dB line */}
                    <div className="absolute w-4 h-px bg-white/20 left-1/2 -translate-x-1/2 top-1/2" />

                    {/* Filled range */}
                    <div
                      className="absolute w-1 rounded-full bg-[#1DB954]/50"
                      style={{
                        bottom: settings.bands[index] >= 0 ? '50%' : `${50 + (Math.abs(settings.bands[index]) / 12) * 50}%`,
                        top: settings.bands[index] >= 0 ? `${50 - (settings.bands[index] / 12) * 50}%` : '50%',
                      }}
                    />

                    {/* Thumb */}
                    <motion.div
                      className="absolute w-6 h-6 bg-[#1DB954] rounded-full shadow-lg cursor-grab active:cursor-grabbing z-10 flex items-center justify-center"
                      style={{
                        bottom: `${((settings.bands[index] + 12) / 24) * 100}%`,
                        transform: 'translateY(50%)',
                      }}
                      whileTap={{ scale: 1.2 }}
                    >
                      <div className="w-3 h-0.5 bg-[#090909] rounded-full" />
                    </motion.div>

                    {/* Invisible touch area */}
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={settings.bands[index]}
                      onChange={(e) => handleBandChange(index, parseInt(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                      aria-label={`${band.frequency} band`}
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    />
                  </div>

                  {/* Frequency label */}
                  <span className="text-[10px] text-white/30 font-medium">{band.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">Effects</p>

            <div className="flex items-center justify-between bg-[#181818] rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white/80">Bass Boost</p>
                <p className="text-xs text-white/30">Enhance low frequencies</p>
              </div>
              <Switch
                checked={settings.bassBoost}
                onCheckedChange={() => handleToggle('bassBoost')}
                className="data-[state=checked]:bg-[#1DB954]"
              />
            </div>

            <div className="flex items-center justify-between bg-[#181818] rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white/80">Virtualizer</p>
                <p className="text-xs text-white/30">Spatial audio effect</p>
              </div>
              <Switch
                checked={settings.virtualizer}
                onCheckedChange={() => handleToggle('virtualizer')}
                className="data-[state=checked]:bg-[#1DB954]"
              />
            </div>

            <div className="flex items-center justify-between bg-[#181818] rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white/80">Loudness Enhancer</p>
                <p className="text-xs text-white/30">Boost perceived volume</p>
              </div>
              <Switch
                checked={settings.loudnessEnhancer}
                onCheckedChange={() => handleToggle('loudnessEnhancer')}
                className="data-[state=checked]:bg-[#1DB954]"
              />
            </div>
          </div>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
