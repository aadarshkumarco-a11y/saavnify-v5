'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Copy,
  MessageCircle,
  Twitter,
  Facebook,
  Music,
  Check,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Track } from '@/types';

interface ShareViewProps {
  track: Track;
  open: boolean;
  onClose: () => void;
}

export function ShareView({ track, open, onClose }: ShareViewProps) {
  const [copied, setCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const youtubeUrl = `https://www.youtube.com/watch?v=${track.videoId}`;
  const shareText = `🎵 Listening to "${track.title}" by ${track.artist} on SAAVNIFY`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(youtubeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = youtubeUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [youtubeUrl]);

  const handleWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + youtubeUrl)}`;
    window.open(url, '_blank');
  }, [shareText, youtubeUrl]);

  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(youtubeUrl)}`;
    window.open(url, '_blank');
  }, [shareText, youtubeUrl]);

  const handleFacebook = useCallback(() => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(youtubeUrl)}`;
    window.open(url, '_blank');
  }, [youtubeUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: track.title,
          text: shareText,
          url: youtubeUrl,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  }, [track.title, shareText, youtubeUrl, handleCopyLink]);

  const shareOptions = [
    {
      id: 'copy',
      label: 'Copy Link',
      icon: copied ? Check : Copy,
      color: copied ? '#1DB954' : '#ffffff',
      bgColor: copied ? 'bg-[#1DB954]/15' : 'bg-[#282828]',
      action: handleCopyLink,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      bgColor: 'bg-[#25D366]/15',
      action: handleWhatsApp,
    },
    {
      id: 'twitter',
      label: 'Twitter / X',
      icon: Twitter,
      color: '#ffffff',
      bgColor: 'bg-[#282828]',
      action: handleTwitter,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      bgColor: 'bg-[#1877F2]/15',
      action: handleFacebook,
    },
    {
      id: 'native',
      label: 'More...',
      icon: ExternalLink,
      color: '#ffffff',
      bgColor: 'bg-[#282828]',
      action: handleNativeShare,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[#121212] border-[#282828] rounded-t-2xl h-auto max-h-[85vh] p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-[#282828]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 size={18} className="text-[#1DB954]" />
              <SheetTitle className="text-white text-lg font-bold">Share</SheetTitle>
            </div>
          </div>
          <SheetDescription className="sr-only">Share this track with others</SheetDescription>
        </SheetHeader>

        <div className="px-4 py-4 space-y-5">
          {/* Track Preview Card */}
          <div className="flex items-center gap-3 bg-[#181818] rounded-xl p-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
              {track.thumbnail ? (
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                  <Music size={24} className="text-white/30" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{track.title}</p>
              <p className="text-xs text-white/40 truncate mt-0.5">{track.artist}</p>
              <p className="text-[10px] text-white/20 mt-1">YouTube Music</p>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-1.5">
            {shareOptions.map((option) => (
              <motion.button
                key={option.id}
                onClick={option.action}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-10 h-10 rounded-full ${option.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <option.icon size={18} style={{ color: option.color }} />
                </div>
                <span className="text-sm font-medium text-white/80">{option.label}</span>
                {option.id === 'copy' && copied && (
                  <span className="ml-auto text-xs text-[#1DB954] font-medium">Copied!</span>
                )}
              </motion.button>
            ))}
          </div>

          {/* Generate Share Card */}
          <div className="border-t border-[#282828] pt-4">
            <motion.button
              onClick={() => setShowShareCard(!showShareCard)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-full bg-[#1DB954]/15 flex items-center justify-center">
                <ImageIcon size={18} className="text-[#1DB954]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white/80">Generate Share Card</p>
                <p className="text-xs text-white/30">Create a styled poster</p>
              </div>
            </motion.button>

            <AnimatePresence>
              {showShareCard && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex justify-center">
                    <div
                      ref={shareCardRef}
                      className="w-[280px] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
                    >
                      {/* Share Card */}
                      <div
                        className="relative p-6"
                        style={{
                          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
                        }}
                      >
                        {/* Accent glow */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#1DB954]/10 rounded-full blur-[60px]" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#1DB954]/5 rounded-full blur-[50px]" />

                        {/* Artwork */}
                        <div className="relative mb-5">
                          <div className="w-full aspect-square rounded-xl overflow-hidden shadow-xl shadow-black/40">
                            {track.thumbnail ? (
                              <img
                                src={track.thumbnail}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                                <Music size={60} className="text-white/20" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Track Info */}
                        <div className="relative text-center mb-5">
                          <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">
                            {track.title}
                          </h3>
                          <p className="text-sm text-white/50 mt-1">{track.artist}</p>
                        </div>

                        {/* Branding */}
                        <div className="relative flex items-center justify-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center">
                            <Music size={12} className="text-[#090909]" />
                          </div>
                          <span className="text-xs font-semibold text-white/40 tracking-wider uppercase">
                            Listening on SAAVNIFY
                          </span>
                        </div>

                        {/* Bottom accent bar */}
                        <div className="mt-4 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#1DB954] to-transparent" />
                      </div>
                    </div>
                  </div>

                  {/* Save instruction */}
                  <p className="text-center text-xs text-white/20 mt-3">
                    Long press or right-click to save the image
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
