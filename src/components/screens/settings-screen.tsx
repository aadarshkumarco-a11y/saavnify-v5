"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Sliders,
  Languages,
  Shield,
  HardDrive,
  Info,
  ChevronLeft,
  Check,
  Bell,
  RefreshCw,
  Sparkles,
  Github,
  FileText,
  ScrollText,
  ExternalLink,
  Music,
  Trash2,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useSettingsStore,
  PLAYER_STYLE_OPTIONS,
  HOME_STYLE_OPTIONS,
  LIBRARY_STYLE_OPTIONS,
  MINI_PLAYER_OPTIONS,
  SLIDER_OPTIONS,
  AUDIO_QUALITY_OPTIONS,
} from '@/stores/settings-store';
import { useThemeStore, THEME_PRESETS } from '@/stores/theme-store';
import { useLibraryStore } from '@/stores/library-store';
import { toast } from 'sonner';
import type { ThemeName } from '@/types';

// ---- Section Definitions ----

type SectionId =
  | 'appearance'
  | 'player'
  | 'content'
  | 'privacy'
  | 'storage'
  | 'about';

const SECTIONS: {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    description: 'Themes, colors & layout styles',
  },
  {
    id: 'player',
    label: 'Player',
    icon: Sliders,
    description: 'Playback & full-screen player',
  },
  {
    id: 'content',
    label: 'Content',
    icon: Languages,
    description: 'Language, lyrics & restrictions',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: Shield,
    description: 'History & recommendations',
  },
  {
    id: 'storage',
    label: 'Storage',
    icon: HardDrive,
    description: 'Cache & downloads',
  },
  {
    id: 'about',
    label: 'About',
    icon: Info,
    description: 'App info & links',
  },
];

// ---- Accent Colors ----

const ACCENT_PRESETS = [
  '#1DB954',
  '#f97316',
  '#ec4899',
  '#06b6d4',
  '#a855f7',
  '#ef4444',
  '#eab308',
  '#14b8a6',
];

// ---- Languages ----

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'mr', label: 'Marathi' },
];

const LYRICS_PROVIDERS = [
  { value: 'auto', label: 'Auto', desc: 'Try all providers in order' },
  { value: 'lrclib', label: 'lrclib.net', desc: 'Synced lyrics database' },
  { value: 'kugou', label: 'KuGou', desc: 'KuGou music lyrics' },
  { value: 'youtube', label: 'YouTube', desc: 'YouTube subtitle tracks' },
] as const;

// ---- Reusable Setting Row ----

function SettingRow({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-[#222222] flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-[#1DB954]" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{title}</p>
          {description && (
            <p className="text-xs text-[#B3B3B3] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ---- Section Heading ----

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="text-xs text-[#B3B3B3] mt-0.5">{description}</p>
      )}
    </div>
  );
}

// ---- Appearance Section ----

function AppearanceSection() {
  const settings = useSettingsStore();
  const themeStore = useThemeStore();

  const handleSetTheme = (theme: ThemeName) => {
    themeStore.setTheme(theme);
    toast.success(`Theme: ${THEME_PRESETS[theme].label}`);
  };

  const handleAccent = (color: string) => {
    themeStore.setAccentColor(color);
    toast.success('Accent color updated');
  };

  const handleAmoled = (enabled: boolean) => {
    themeStore.setAmoledMode(enabled);
    toast.success(enabled ? 'AMOLED mode on' : 'AMOLED mode off');
  };

  const handleDynamic = (enabled: boolean) => {
    themeStore.setDynamicColors(enabled);
    settings.set('dynamicColors', enabled);
    toast.success(enabled ? 'Dynamic colors on' : 'Dynamic colors off');
  };

  const handleHomeStyle = (v: string) => {
    settings.setHomeStyle(v as any);
    toast.success(`Home style: ${v}`);
  };

  const handleLibraryStyle = (v: string) => {
    settings.setLibraryStyle(v as any);
    toast.success(`Library style: ${v}`);
  };

  const handleMiniPlayer = (v: string) => {
    settings.setMiniPlayerStyle(v as any);
    toast.success(`Mini player: ${v}`);
  };

  const handleSlider = (v: string) => {
    settings.setSliderStyle(v as any);
    toast.success(`Slider style: ${v}`);
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Appearance"
        description="Make Saavnify look the way you like."
      />

      {/* Theme Picker */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <p className="text-sm font-semibold mb-3">Theme</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(THEME_PRESETS) as ThemeName[]).map((key) => {
            const t = THEME_PRESETS[key];
            const active = themeStore.selectedTheme === key;
            return (
              <button
                key={key}
                onClick={() => handleSetTheme(key)}
                className={`relative rounded-2xl p-3 text-left transition-all ${
                  active
                    ? 'ring-2 ring-[#1DB954]'
                    : 'ring-1 ring-[#282828] hover:ring-[#3a3a3a]'
                }`}
                style={{ backgroundColor: t.cardBg }}
                aria-pressed={active}
                aria-label={`Theme: ${t.label}`}
              >
                <div className="flex gap-1.5 mb-2.5">
                  <span
                    className="w-5 h-5 rounded-full border border-white/10"
                    style={{ backgroundColor: t.background }}
                  />
                  <span
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: t.accent }}
                  />
                  <span
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: t.elevatedSurface }}
                  />
                </div>
                <p
                  className="text-xs font-medium"
                  style={{ color: t.primaryText }}
                >
                  {t.label}
                </p>
                {active && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1DB954] flex items-center justify-center">
                    <Check size={12} className="text-black" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Accent Color */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold">Accent Color</p>
            <p className="text-xs text-[#B3B3B3]">
              Current: {themeStore.accentColor}
            </p>
          </div>
          <div
            className="w-8 h-8 rounded-full border-2 border-white/10"
            style={{ backgroundColor: themeStore.accentColor }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((c) => {
            const active = themeStore.accentColor.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                onClick={() => handleAccent(c)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                  active ? 'ring-2 ring-white ring-offset-2 ring-offset-[#181818]' : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Accent ${c}`}
                aria-pressed={active}
              >
                {active && <Check size={14} className="text-black" />}
              </button>
            );
          })}
          <label
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-dashed border-[#3a3a3a] flex items-center justify-center cursor-pointer hover:border-[#1DB954] relative"
            aria-label="Custom accent color"
          >
            <Sparkles size={14} className="text-[#B3B3B3]" />
            <input
              type="color"
              value={themeStore.accentColor}
              onChange={(e) => handleAccent(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Custom accent color picker"
            />
          </label>
        </div>
      </Card>

      {/* AMOLED + Dynamic */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="AMOLED Black"
          description="Pure black backgrounds to save battery on OLED screens."
          icon={Palette}
        >
          <Switch
            checked={themeStore.amoledMode}
            onCheckedChange={handleAmoled}
            aria-label="Toggle AMOLED black mode"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Dynamic Colors"
          description="Adapt app colors based on your system wallpaper (Material You)."
          icon={Sparkles}
        >
          <Switch
            checked={themeStore.dynamicColors}
            onCheckedChange={handleDynamic}
            aria-label="Toggle dynamic colors"
          />
        </SettingRow>
      </Card>

      {/* Home Style */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <p className="text-sm font-semibold mb-3">Home Screen Style</p>
        <RadioGroup
          value={settings.homeStyle}
          onValueChange={handleHomeStyle}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {HOME_STYLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`home-${opt.value}`}
              className={`flex flex-col gap-1 p-3 rounded-2xl cursor-pointer transition-all border ${
                settings.homeStyle === opt.value
                  ? 'border-[#1DB954] bg-[#1DB954]/10'
                  : 'border-[#282828] hover:border-[#3a3a3a]'
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value={opt.value}
                  id={`home-${opt.value}`}
                  className="border-[#1DB954] text-[#1DB954]"
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <span className="text-[10px] text-[#B3B3B3] ml-6">
                {opt.description}
              </span>
            </label>
          ))}
        </RadioGroup>
      </Card>

      {/* Library Style */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <p className="text-sm font-semibold mb-3">Library Screen Style</p>
        <RadioGroup
          value={settings.libraryStyle}
          onValueChange={handleLibraryStyle}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        >
          {LIBRARY_STYLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`lib-${opt.value}`}
              className={`flex flex-col gap-1 p-3 rounded-2xl cursor-pointer transition-all border ${
                settings.libraryStyle === opt.value
                  ? 'border-[#1DB954] bg-[#1DB954]/10'
                  : 'border-[#282828] hover:border-[#3a3a3a]'
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value={opt.value}
                  id={`lib-${opt.value}`}
                  className="border-[#1DB954] text-[#1DB954]"
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <span className="text-[10px] text-[#B3B3B3] ml-6">
                {opt.description}
              </span>
            </label>
          ))}
        </RadioGroup>
      </Card>

      {/* Mini Player + Slider Style */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow title="Mini Player Style" icon={Music}>
          <Select
            value={settings.miniPlayerStyle}
            onValueChange={handleMiniPlayer}
          >
            <SelectTrigger className="w-32 bg-[#222222] border-[#282828] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#222222] border-[#282828] text-white">
              {MINI_PLAYER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow title="Slider Style" icon={Sliders}>
          <Select
            value={settings.sliderStyle}
            onValueChange={handleSlider}
          >
            <SelectTrigger className="w-32 bg-[#222222] border-[#282828] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#222222] border-[#282828] text-white">
              {SLIDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </Card>
    </div>
  );
}

// ---- Player Section ----

function PlayerSection() {
  const settings = useSettingsStore();

  const handlePlayerStyle = (v: string) => {
    settings.setPlayerStyle(v as any);
    toast.success(`Player style: ${v}`);
  };

  const toggle = (
    key:
      | 'persistentQueue'
      | 'skipSilence'
      | 'audioNormalization'
      | 'autoLoadMore'
      | 'autoSkipOnError'
      | 'stopMusicOnTaskClear'
      | 'showLikeButton'
      | 'showDownloadButton',
    label: string
  ) => (v: boolean) => {
    settings.set(key, v);
    toast.success(`${label}: ${v ? 'on' : 'off'}`);
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Player"
        description="Tune the playback experience."
      />

      {/* Player Style Grid */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <p className="text-sm font-semibold mb-3">Player Screen Style</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {PLAYER_STYLE_OPTIONS.map((opt) => {
            const active = settings.playerStyle === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handlePlayerStyle(opt.value)}
                className={`relative p-3 rounded-2xl text-left transition-all border ${
                  active
                    ? 'border-[#1DB954] bg-[#1DB954]/10'
                    : 'border-[#282828] hover:border-[#3a3a3a]'
                }`}
                aria-pressed={active}
                aria-label={`Player style: ${opt.label}`}
              >
                {/* Mini preview swatch */}
                <div className="h-12 rounded-lg mb-2 overflow-hidden relative bg-[#222222]">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        opt.value === 'liquid' || opt.value === 'cloudglow'
                          ? 'linear-gradient(135deg,#1DB954,#a855f7)'
                          : opt.value === 'groove'
                            ? 'radial-gradient(circle at 50% 50%, #1DB954 30%, #222 31%)'
                            : opt.value === 'frost'
                              ? 'linear-gradient(135deg,rgba(255,255,255,0.2),rgba(29,185,84,0.3))'
                              : opt.value === 'popsy'
                                ? 'linear-gradient(45deg,#ec4899,#f97316,#eab308)'
                                : opt.value === 'paper'
                                  ? '#f5f5f5'
                                  : '#1a1a1a',
                    }}
                  />
                  <div className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-full bg-white/30" />
                  <div className="absolute bottom-3 left-1.5 w-6 h-6 rounded-full bg-white/40" />
                </div>
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="text-[10px] text-[#B3B3B3] mt-0.5 leading-tight">
                  {opt.description}
                </p>
                {active && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#1DB954] flex items-center justify-center">
                    <Check size={12} className="text-black" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Audio Quality */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Audio Quality"
          description="Higher quality uses more data."
          icon={Sliders}
        >
          <Select
            value={settings.audioQuality}
            onValueChange={(v) => {
              settings.setAudioQuality(v as any);
              toast.success(`Audio quality: ${v}`);
            }}
          >
            <SelectTrigger className="w-40 bg-[#222222] border-[#282828] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#222222] border-[#282828] text-white">
              {AUDIO_QUALITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </Card>

      {/* Switches */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Persistent Queue"
          description="Keep your play queue across app restarts."
          icon={Music}
        >
          <Switch
            checked={settings.persistentQueue}
            onCheckedChange={toggle('persistentQueue', 'Persistent queue')}
            aria-label="Toggle persistent queue"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Skip Silence"
          description="Automatically skip silent sections in tracks."
        >
          <Switch
            checked={settings.skipSilence}
            onCheckedChange={toggle('skipSilence', 'Skip silence')}
            aria-label="Toggle skip silence"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Audio Normalization"
          description="Even out volume across tracks."
        >
          <Switch
            checked={settings.audioNormalization}
            onCheckedChange={toggle('audioNormalization', 'Audio normalization')}
            aria-label="Toggle audio normalization"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Auto Load More"
          description="Automatically load more related tracks when queue ends."
        >
          <Switch
            checked={settings.autoLoadMore}
            onCheckedChange={toggle('autoLoadMore', 'Auto load more')}
            aria-label="Toggle auto load more"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Auto Skip on Error"
          description="Skip to next track if current one fails to play."
        >
          <Switch
            checked={settings.autoSkipOnError}
            onCheckedChange={toggle('autoSkipOnError', 'Auto skip on error')}
            aria-label="Toggle auto skip on error"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Stop Music on Task Clear"
          description="Pause playback when the app is cleared from recents."
        >
          <Switch
            checked={settings.stopMusicOnTaskClear}
            onCheckedChange={toggle('stopMusicOnTaskClear', 'Stop on task clear')}
            aria-label="Toggle stop on task clear"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Show Like Button"
          description="Display the like button in the player."
        >
          <Switch
            checked={settings.showLikeButton}
            onCheckedChange={toggle('showLikeButton', 'Show like button')}
            aria-label="Toggle show like button"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Show Download Button"
          description="Display the download button in the player."
        >
          <Switch
            checked={settings.showDownloadButton}
            onCheckedChange={toggle('showDownloadButton', 'Show download button')}
            aria-label="Toggle show download button"
          />
        </SettingRow>
      </Card>
    </div>
  );
}

// ---- Content Section ----

function ContentSection() {
  const settings = useSettingsStore();
  // Local-only toggles (not yet in AppSettings store)
  const [showExplicit, setShowExplicit] = useState(true);
  const [restrictMode, setRestrictMode] = useState(false);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Content"
        description="Language, lyrics, and what shows up in your feed."
      />

      {/* Language */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Content Language"
          description="Preferred language for music recommendations."
          icon={Languages}
        >
          <Select
            value={settings.language}
            onValueChange={(v) => {
              settings.set('language', v);
              toast.success(`Language: ${LANGUAGES.find((l) => l.value === v)?.label || v}`);
            }}
          >
            <SelectTrigger className="w-40 bg-[#222222] border-[#282828] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#222222] border-[#282828] text-white max-h-72">
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </Card>

      {/* Lyrics Provider */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <p className="text-sm font-semibold mb-3">Lyrics Provider</p>
        <RadioGroup
          value={settings.lyricsProvider}
          onValueChange={(v) => {
            settings.set('lyricsProvider', v as any);
            toast.success(`Lyrics provider: ${v}`);
          }}
          className="space-y-2"
        >
          {LYRICS_PROVIDERS.map((p) => (
            <label
              key={p.value}
              htmlFor={`lyr-${p.value}`}
              className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                settings.lyricsProvider === p.value
                  ? 'border-[#1DB954] bg-[#1DB954]/10'
                  : 'border-[#282828] hover:border-[#3a3a3a]'
              }`}
            >
              <RadioGroupItem
                value={p.value}
                id={`lyr-${p.value}`}
                className="border-[#1DB954] text-[#1DB954]"
              />
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-[10px] text-[#B3B3B3]">{p.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </Card>

      {/* Explicit + Restrict */}
      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Show Explicit Content"
          description="Display tracks marked as explicit."
          icon={Shield}
        >
          <Switch
            checked={showExplicit}
            onCheckedChange={(v) => {
              setShowExplicit(v);
              toast.success(`Explicit content: ${v ? 'shown' : 'hidden'}`);
            }}
            aria-label="Toggle explicit content"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Restrict Mode"
          description="Filter out content flagged as mature or sensitive."
        >
          <Switch
            checked={restrictMode}
            onCheckedChange={(v) => {
              setRestrictMode(v);
              toast.success(`Restrict mode: ${v ? 'on' : 'off'}`);
            }}
            aria-label="Toggle restrict mode"
          />
        </SettingRow>
      </Card>
    </div>
  );
}

// ---- Privacy Section ----

function PrivacySection() {
  // Local-only toggles
  const [pauseSearch, setPauseSearch] = useState(false);
  const [pausePlayback, setPausePlayback] = useState(false);
  const [disableRecs, setDisableRecs] = useState(false);

  const clearSearchHistory = useLibraryStore((s) => s.clearSearchHistory);
  const clearHistory = useLibraryStore((s) => s.clearHistory);
  const historyCount = useLibraryStore((s) => s.history.length);
  const searchHistoryCount = useLibraryStore((s) => s.searchHistory.length);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Privacy"
        description="Control what gets remembered and recommended."
      />

      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Pause Search History"
          description="Stop recording your search queries."
          icon={Shield}
        >
          <Switch
            checked={pauseSearch}
            onCheckedChange={(v) => {
              setPauseSearch(v);
              toast.success(`Search history: ${v ? 'paused' : 'resumed'}`);
            }}
            aria-label="Toggle pause search history"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Pause Playback History"
          description="Stop recording tracks you play."
        >
          <Switch
            checked={pausePlayback}
            onCheckedChange={(v) => {
              setPausePlayback(v);
              toast.success(`Playback history: ${v ? 'paused' : 'resumed'}`);
            }}
            aria-label="Toggle pause playback history"
          />
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Disable Personalized Recommendations"
          description="Use generic recommendations instead of your listening history."
        >
          <Switch
            checked={disableRecs}
            onCheckedChange={(v) => {
              setDisableRecs(v);
              toast.success(`Recommendations: ${v ? 'disabled' : 'enabled'}`);
            }}
            aria-label="Toggle personalized recommendations"
          />
        </SettingRow>
      </Card>

      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Clear Search History"
          description={`${searchHistoryCount} entries saved`}
          icon={Trash2}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (searchHistoryCount === 0) {
                toast('Nothing to clear');
                return;
              }
              clearSearchHistory();
              toast.success('Search history cleared');
            }}
            disabled={searchHistoryCount === 0}
            className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
          >
            Clear
          </Button>
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Clear Playback History"
          description={`${historyCount} entries saved`}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={historyCount === 0}
                className="rounded-full bg-transparent border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-300"
              >
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#181818] border-[#282828] text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear playback history?</AlertDialogTitle>
                <AlertDialogDescription className="text-[#B3B3B3]">
                  This will remove all {historyCount} entries from your
                  listening history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearHistory();
                    toast.success('Playback history cleared');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingRow>
      </Card>
    </div>
  );
}

// ---- Storage Section ----

function StorageSection() {
  const [maxCache, setMaxCache] = useState<number[]>([2]); // in GB
  const [imageCache, setImageCache] = useState(48); // MB
  const [songCache, setSongCache] = useState(187); // MB

  const total = imageCache + songCache;
  const maxBytes = maxCache[0] * 1024;
  const pct = Math.min(100, (total / maxBytes) * 100);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Storage"
        description="Manage on-device cache and downloads."
      />

      <Card className="bg-[#181818] border-[#282828] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-[#1DB954]" />
            <span className="text-sm font-semibold">Cache Usage</span>
          </div>
          <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
            {total} MB / {maxCache[0]} GB
          </Badge>
        </div>
        <div className="h-2 rounded-full bg-[#222222] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1DB954] to-emerald-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#727272] mt-1.5">
          <span>Image cache: {imageCache} MB</span>
          <span>Song cache: {songCache} MB</span>
        </div>
      </Card>

      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Clear Image Cache"
          description={`${imageCache} MB of cover art & thumbnails`}
          icon={Trash2}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImageCache(0);
              toast.success('Image cache cleared');
            }}
            className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
          >
            Clear
          </Button>
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Clear Song Cache"
          description={`${songCache} MB of downloaded audio`}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSongCache(0);
              toast.success('Song cache cleared');
            }}
            className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
          >
            Clear
          </Button>
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Download Location"
          description="/storage/emulated/0/Saavnify/downloads"
          icon={HardDrive}
        >
          <Badge className="bg-[#222222] text-[#B3B3B3] border-0">
            Read-only
          </Badge>
        </SettingRow>
      </Card>

      <Card className="bg-[#181818] border-[#282828] p-4">
        <div className="mb-2">
          <p className="text-sm font-semibold">Max Cache Size</p>
          <p className="text-xs text-[#B3B3B3]">
            Automatically trim cache when it exceeds this limit.
          </p>
        </div>
        <Slider
          value={maxCache}
          onValueChange={(v) => setMaxCache(v)}
          min={1}
          max={8}
          step={1}
          className="my-4"
          aria-label="Max cache size in GB"
        />
        <div className="flex justify-between text-[10px] text-[#727272]">
          <span>1 GB</span>
          <span className="text-[#1DB954] font-semibold">
            {maxCache[0]} GB
          </span>
          <span>8 GB</span>
        </div>
      </Card>
    </div>
  );
}

// ---- About Section ----

function AboutSection() {
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const licenses = useMemo(
    () => [
      { name: 'Next.js', version: '16', license: 'MIT' },
      { name: 'React', version: '19', license: 'MIT' },
      { name: 'TypeScript', version: '5', license: 'Apache-2.0' },
      { name: 'Tailwind CSS', version: '4', license: 'MIT' },
      { name: 'shadcn/ui', version: '-', license: 'MIT' },
      { name: 'Framer Motion', version: '12', license: 'MIT' },
      { name: 'Zustand', version: '5', license: 'MIT' },
      { name: 'Recharts', version: '2', license: 'MIT' },
      { name: 'Lucide Icons', version: '-', license: 'ISC' },
      { name: 'sonner', version: '2', license: 'MIT' },
      { name: 'Prisma', version: '6', license: 'Apache-2.0' },
    ],
    []
  );

  const handleCheckUpdates = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      toast.success('You\'re up to date', {
        description: 'Saavnify v5 · v1.0.0',
      });
    }, 1100);
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="About"
        description="Everything you might want to know."
      />

      <Card className="bg-gradient-to-br from-[#1DB954]/10 to-[#181818] border-[#1DB954]/30 p-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#1DB954]/30">
          <Music size={28} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold">Saavnify v5</h2>
        <p className="text-xs text-[#B3B3B3] mt-1">Version 1.0.0</p>
        <Badge className="mt-3 bg-[#1DB954]/10 text-[#1DB954] border-0">
          <Crown size={12} className="mr-1" /> Ported from AirBeats
        </Badge>
        <p className="text-xs text-[#B3B3B3] mt-3 max-w-md mx-auto leading-relaxed">
          A premium music streaming experience built with Next.js 16, TypeScript
          & Tailwind CSS. Many UI/UX ideas ported from AirBeats (Kotlin/Compose).
        </p>
      </Card>

      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Check for Updates"
          description="See if a newer version is available."
          icon={RefreshCw}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckUpdates}
            disabled={checking}
            className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
          >
            {checking ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <RefreshCw size={14} className="mr-2" />
            )}
            {checking ? 'Checking…' : 'Check'}
          </Button>
        </SettingRow>
        <Separator className="bg-[#222222]" />
        <SettingRow
          title="Notifications"
          description="Get notified about new releases & updates."
          icon={Bell}
        >
          <Switch defaultChecked aria-label="Toggle notifications" />
        </SettingRow>
      </Card>

      <Card className="bg-[#181818] border-[#282828] p-4">
        <a
          href="https://github.com/aadarshkumarco-a11y/saavnify-v4"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-4 py-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#222222] flex items-center justify-center">
              <Github size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">GitHub Repository</p>
              <p className="text-xs text-[#B3B3B3]">Source code & releases</p>
            </div>
          </div>
          <ExternalLink size={16} className="text-[#B3B3B3]" />
        </a>
        <Separator className="bg-[#222222]" />
        <a
          href="#"
          className="flex items-center justify-between gap-4 py-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#222222] flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Privacy Policy</p>
              <p className="text-xs text-[#B3B3B3]">How we handle your data</p>
            </div>
          </div>
          <ExternalLink size={16} className="text-[#B3B3B3]" />
        </a>
        <Separator className="bg-[#222222]" />
        <a
          href="#"
          className="flex items-center justify-between gap-4 py-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#222222] flex items-center justify-center">
              <ScrollText size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Terms of Service</p>
              <p className="text-xs text-[#B3B3B3]">Usage terms & conditions</p>
            </div>
          </div>
          <ExternalLink size={16} className="text-[#B3B3B3]" />
        </a>
      </Card>

      <Card className="bg-[#181818] border-[#282828] p-4">
        <SettingRow
          title="Open Source Licenses"
          description="View licenses for libraries used in Saavnify."
          icon={Info}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLicensesOpen(true)}
            className="rounded-full bg-transparent border-[#282828] text-white hover:bg-[#222222] hover:text-white"
          >
            View
          </Button>
        </SettingRow>
      </Card>

      <p className="text-center text-[10px] text-[#727272] py-2">
        Made with ❤️ · Saavnify v5 © 2024
      </p>

      {/* Licenses Dialog */}
      <Dialog open={licensesOpen} onOpenChange={setLicensesOpen}>
        <DialogContent className="bg-[#181818] border-[#282828] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Open Source Licenses</DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              Saavnify v5 is built on these amazing open-source projects.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
            {licenses.map((lib) => (
              <div
                key={lib.name}
                className="flex items-center justify-between bg-[#222222] rounded-xl px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{lib.name}</p>
                  <p className="text-[10px] text-[#B3B3B3]">
                    v{lib.version} · {lib.license}
                  </p>
                </div>
                <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
                  {lib.license}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Main Settings Component ----

export function SettingsScreen() {
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');

  const renderSection = () => {
    switch (activeSection) {
      case 'appearance':
        return <AppearanceSection />;
      case 'player':
        return <PlayerSection />;
      case 'content':
        return <ContentSection />;
      case 'privacy':
        return <PrivacySection />;
      case 'storage':
        return <StorageSection />;
      case 'about':
        return <AboutSection />;
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
            <Sliders size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Settings
            </h1>
            <p className="text-xs text-[#B3B3B3]">
              Personalize every corner of your app
            </p>
          </div>
        </motion.div>

        {/* Mobile back button (visible when not on appearance) */}
        <div className="sm:hidden mb-3">
          {activeSection !== 'appearance' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection('appearance')}
              className="rounded-full text-[#B3B3B3] hover:text-white hover:bg-[#181818]"
            >
              <ChevronLeft size={16} className="mr-1" /> All settings
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar (desktop) / Section list (mobile) */}
          <aside className={`${activeSection !== 'appearance' ? 'hidden sm:block' : ''} sm:sticky sm:top-6 sm:self-start`}>
            <nav className="space-y-1.5" aria-label="Settings sections">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                      active
                        ? 'bg-[#181818] ring-1 ring-[#1DB954]/40'
                        : 'hover:bg-[#181818]/60'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        active
                          ? 'bg-[#1DB954] text-black'
                          : 'bg-[#222222] text-[#1DB954]'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${active ? 'text-white' : 'text-white'}`}>
                        {s.label}
                      </p>
                      <p className="text-[10px] text-[#B3B3B3] truncate">
                        {s.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content Panel */}
          <main className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
