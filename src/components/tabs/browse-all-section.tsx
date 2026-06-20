'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Search, X, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerStore } from '@/stores/player-store';
import { useLibraryStore } from '@/stores/library-store';
import {
  getTamilHits, getTeluguHits, getMarathiHits, getBengaliHits,
  getKannadaHits, getMalayalamHits, getGujaratiHits, getHaryanviHits,
  getBhojpuriHits, getRajasthaniHits, getAssameseHits, getOdiaHits,
  getIndianClassical, getBhajans, getGurbani, getSufi, getGhazals,
  getPartyHindi, getSadHindi, getRomanticHindi, getRoadTrip,
  getMorningPlaylist, getNightPlaylist, getFocusStudy, getDanceHindi,
  get90sBollywood, get2000sBollywood, get2010sBollywood, getOldIsGold, getRetroBollywood,
  getEnglishPop, getEnglishHits, getGlobalHits, getKPop, getLatinHits,
  getEDM, getHipHop, getRnB, getRock, getJazz, getCountry, getReggae,
  getIndieHindi, getIndieEnglish, getAcoustic, getBollywoodAcoustic,
  getArijitSingh, getAtifAslam, getShreyaGhoshal, getDiljitDosanjh,
  getSidhuMooseWala, getAPDhillon, getNehaKakkar, getJubinNautiyal,
  getPritam, getVishalShekhar, getARRahman,
  getHoliSongs, getDiwaliSongs, getWeddingSongs, getIndependenceDay,
} from '@/lib/music-aggregator';
import type { Track } from '@/types';

// Category tiles — each has a fetcher + label + gradient color
interface Category {
  id: string;
  label: string;
  fetcher: (limit?: number) => Promise<Track[]>;
  gradient: string; // tailwind gradient classes
}

const CATEGORIES: Category[] = [
  // Regional Indian
  { id: 'tamil', label: 'Tamil Hits', fetcher: getTamilHits, gradient: 'from-orange-500 to-red-500' },
  { id: 'telugu', label: 'Telugu Hits', fetcher: getTeluguHits, gradient: 'from-yellow-500 to-orange-600' },
  { id: 'marathi', label: 'Marathi', fetcher: getMarathiHits, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'bengali', label: 'Bengali', fetcher: getBengaliHits, gradient: 'from-rose-500 to-pink-600' },
  { id: 'kannada', label: 'Kannada', fetcher: getKannadaHits, gradient: 'from-red-500 to-rose-700' },
  { id: 'malayalam', label: 'Malayalam', fetcher: getMalayalamHits, gradient: 'from-green-500 to-emerald-700' },
  { id: 'gujarati', label: 'Gujarati', fetcher: getGujaratiHits, gradient: 'from-amber-500 to-yellow-600' },
  { id: 'haryanvi', label: 'Haryanvi', fetcher: getHaryanviHits, gradient: 'from-lime-500 to-green-600' },
  { id: 'bhojpuri', label: 'Bhojpuri', fetcher: getBhojpuriHits, gradient: 'from-fuchsia-500 to-purple-600' },
  { id: 'rajasthani', label: 'Rajasthani', fetcher: getRajasthaniHits, gradient: 'from-orange-600 to-amber-700' },
  { id: 'assamese', label: 'Assamese', fetcher: getAssameseHits, gradient: 'from-teal-500 to-cyan-600' },
  { id: 'odia', label: 'Odia', fetcher: getOdiaHits, gradient: 'from-violet-500 to-indigo-600' },

  // Classical & Devotional
  { id: 'classical', label: 'Indian Classical', fetcher: getIndianClassical, gradient: 'from-amber-600 to-orange-800' },
  { id: 'bhajans', label: 'Bhajans', fetcher: getBhajans, gradient: 'from-orange-400 to-red-600' },
  { id: 'gurbani', label: 'Gurbani', fetcher: getGurbani, gradient: 'from-yellow-400 to-amber-600' },
  { id: 'sufi', label: 'Sufi', fetcher: getSufi, gradient: 'from-purple-500 to-indigo-700' },
  { id: 'ghazals', label: 'Ghazals', fetcher: getGhazals, gradient: 'from-stone-500 to-amber-800' },

  // Moods
  { id: 'party', label: 'Party', fetcher: getPartyHindi, gradient: 'from-pink-500 to-rose-600' },
  { id: 'sad', label: 'Sad & Emotional', fetcher: getSadHindi, gradient: 'from-blue-500 to-indigo-700' },
  { id: 'romantic', label: 'Romantic', fetcher: getRomanticHindi, gradient: 'from-rose-400 to-pink-600' },
  { id: 'roadtrip', label: 'Road Trip', fetcher: getRoadTrip, gradient: 'from-cyan-500 to-blue-600' },
  { id: 'morning', label: 'Morning', fetcher: getMorningPlaylist, gradient: 'from-amber-300 to-orange-500' },
  { id: 'night', label: 'Night', fetcher: getNightPlaylist, gradient: 'from-indigo-700 to-slate-900' },
  { id: 'focus', label: 'Focus & Study', fetcher: getFocusStudy, gradient: 'from-emerald-400 to-teal-600' },
  { id: 'dance', label: 'Dance', fetcher: getDanceHindi, gradient: 'from-fuchsia-500 to-pink-700' },

  // Decades
  { id: '90s', label: '90s Bollywood', fetcher: get90sBollywood, gradient: 'from-amber-500 to-red-600' },
  { id: '2000s', label: '2000s Bollywood', fetcher: get2000sBollywood, gradient: 'from-green-500 to-emerald-700' },
  { id: '2010s', label: '2010s Bollywood', fetcher: get2010sBollywood, gradient: 'from-blue-500 to-purple-600' },
  { id: 'oldgold', label: 'Old is Gold', fetcher: getOldIsGold, gradient: 'from-yellow-600 to-amber-800' },
  { id: 'retro', label: 'Retro', fetcher: getRetroBollywood, gradient: 'from-stone-400 to-amber-700' },

  // International
  { id: 'engpop', label: 'English Pop', fetcher: getEnglishPop, gradient: 'from-red-500 to-rose-700' },
  { id: 'enghits', label: 'English Hits', fetcher: getEnglishHits, gradient: 'from-blue-500 to-cyan-600' },
  { id: 'global', label: 'Global Hits', fetcher: getGlobalHits, gradient: 'from-purple-500 to-fuchsia-700' },
  { id: 'kpop', label: 'K-Pop', fetcher: getKPop, gradient: 'from-pink-400 to-purple-600' },
  { id: 'latin', label: 'Latin', fetcher: getLatinHits, gradient: 'from-orange-500 to-red-700' },
  { id: 'edm', label: 'EDM', fetcher: getEDM, gradient: 'from-cyan-400 to-blue-600' },
  { id: 'hiphop', label: 'Hip Hop', fetcher: getHipHop, gradient: 'from-amber-500 to-orange-700' },
  { id: 'rnb', label: 'R&B / Soul', fetcher: getRnB, gradient: 'from-violet-500 to-purple-700' },
  { id: 'rock', label: 'Rock', fetcher: getRock, gradient: 'from-red-600 to-stone-800' },
  { id: 'jazz', label: 'Jazz', fetcher: getJazz, gradient: 'from-amber-400 to-yellow-700' },
  { id: 'country', label: 'Country', fetcher: getCountry, gradient: 'from-lime-500 to-green-700' },
  { id: 'reggae', label: 'Reggae', fetcher: getReggae, gradient: 'from-green-400 to-yellow-600' },

  // Indie
  { id: 'indiehindi', label: 'Indie Hindi', fetcher: getIndieHindi, gradient: 'from-teal-500 to-emerald-700' },
  { id: 'indieeng', label: 'Indie English', fetcher: getIndieEnglish, gradient: 'from-rose-400 to-pink-600' },
  { id: 'acoustic', label: 'Acoustic', fetcher: getAcoustic, gradient: 'from-amber-400 to-orange-600' },
  { id: 'bollyacoustic', label: 'Bollywood Acoustic', fetcher: getBollywoodAcoustic, gradient: 'from-orange-400 to-red-500' },

  // Top Artists
  { id: 'arijit', label: 'Arijit Singh', fetcher: getArijitSingh, gradient: 'from-slate-500 to-slate-800' },
  { id: 'atif', label: 'Atif Aslam', fetcher: getAtifAslam, gradient: 'from-blue-600 to-indigo-800' },
  { id: 'shreya', label: 'Shreya Ghoshal', fetcher: getShreyaGhoshal, gradient: 'from-pink-500 to-rose-700' },
  { id: 'diljit', label: 'Diljit Dosanjh', fetcher: getDiljitDosanjh, gradient: 'from-yellow-500 to-amber-700' },
  { id: 'sidhu', label: 'Sidhu Moose Wala', fetcher: getSidhuMooseWala, gradient: 'from-stone-600 to-zinc-900' },
  { id: 'apdhillon', label: 'AP Dhillon', fetcher: getAPDhillon, gradient: 'from-red-600 to-rose-900' },
  { id: 'neha', label: 'Neha Kakkar', fetcher: getNehaKakkar, gradient: 'from-fuchsia-500 to-pink-700' },
  { id: 'jubin', label: 'Jubin Nautiyal', fetcher: getJubinNautiyal, gradient: 'from-emerald-500 to-green-800' },
  { id: 'pritam', label: 'Pritam', fetcher: getPritam, gradient: 'from-violet-500 to-purple-800' },
  { id: 'vishalsekhar', label: 'Vishal-Shekhar', fetcher: getVishalShekhar, gradient: 'from-cyan-500 to-blue-700' },
  { id: 'arrahman', label: 'A. R. Rahman', fetcher: getARRahman, gradient: 'from-amber-500 to-orange-800' },

  // Festive
  { id: 'holi', label: 'Holi', fetcher: getHoliSongs, gradient: 'from-pink-400 to-purple-600' },
  { id: 'diwali', label: 'Diwali', fetcher: getDiwaliSongs, gradient: 'from-amber-400 to-orange-600' },
  { id: 'wedding', label: 'Wedding', fetcher: getWeddingSongs, gradient: 'from-rose-400 to-red-600' },
  { id: 'independence', label: 'Patriotic', fetcher: getIndependenceDay, gradient: 'from-orange-500 to-green-700' },
];

export function BrowseAllSection() {
  const [selected, setSelected] = useState<Category | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const addToHistory = useLibraryStore((s) => s.addToHistory);

  const openCategory = async (cat: Category) => {
    setSelected(cat);
    setLoading(true);
    setTracks([]);
    try {
      const t = await cat.fetcher(25);
      setTracks(t);
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const closeCategory = () => {
    setSelected(null);
    setTracks([]);
  };

  const handlePlay = (track: Track, index: number) => {
    playQueue(tracks, index, 'browse');
    addToHistory(track);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4 }}
      className="mb-7"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Music size={20} className="text-[#1DB954]" />
          Browse all
        </h2>
      </div>

      {/* Category grid */}
      {!selected && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => openCategory(cat)}
              className={`relative h-[88px] rounded-xl overflow-hidden bg-gradient-to-br ${cat.gradient} p-3 text-left group transition-transform hover:scale-[1.03] active:scale-95`}
            >
              <span className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              <span className="relative text-white font-bold text-sm leading-tight drop-shadow-md line-clamp-2">
                {cat.label}
              </span>
              <Music
                size={56}
                className="absolute -right-2 -bottom-2 text-white/30 rotate-[25deg] group-hover:rotate-[35deg] transition-transform"
              />
            </button>
          ))}
        </div>
      )}

      {/* Selected category tracks */}
      {selected && (
        <div className="rounded-2xl bg-[#181818] p-4 border border-[#282828]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selected.gradient} flex items-center justify-center`}>
                <Music size={18} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">{selected.label}</h3>
            </div>
            <button
              onClick={closeCategory}
              className="p-2 rounded-full bg-[#282828] hover:bg-[#383838] text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-8 text-[#727272]">
              <Music size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tracks found. Try another category.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[420px] overflow-y-auto no-scrollbar">
              {tracks.map((track, idx) => (
                <button
                  key={`${track.id}-${idx}`}
                  onClick={() => handlePlay(track, idx)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#282828] group text-left"
                >
                  <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"%3E%3Crect fill="%23282828" width="48" height="48"/%3E%3C/svg%3E';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play size={18} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <p className="text-xs text-[#727272] truncate">{track.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}
