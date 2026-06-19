'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ListMusic } from 'lucide-react';

interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description?: string) => void;
}

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  onCreate,
}: CreatePlaylistDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, description.trim() || undefined);
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181818] border-[#282828] text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1DB954] to-[#148F3F] flex items-center justify-center"
            >
              <ListMusic size={16} className="text-white" />
            </motion.div>
            Create New Playlist
          </DialogTitle>
          <DialogDescription className="text-[#B3B3B3]">
            Give your playlist a name and optional description.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B3B3B3]" htmlFor="playlist-name">
              Name
            </label>
            <Input
              id="playlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="My Awesome Playlist"
              className="bg-[#090909] border-[#282828] text-white placeholder:text-[#727272] focus-visible:border-[#1DB954] focus-visible:ring-[#1DB954]/20"
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B3B3B3]" htmlFor="playlist-desc">
              Description <span className="text-[#727272]">(optional)</span>
            </label>
            <Input
              id="playlist-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What&apos;s this playlist about?"
              className="bg-[#090909] border-[#282828] text-white placeholder:text-[#727272] focus-visible:border-[#1DB954] focus-visible:ring-[#1DB954]/20"
              maxLength={300}
            />
          </div>
        </motion.div>

        <DialogFooter>
          <motion.button
            onClick={handleCreate}
            disabled={!name.trim()}
            whileHover={{ scale: name.trim() ? 1.02 : 1 }}
            whileTap={{ scale: name.trim() ? 0.98 : 1 }}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              name.trim()
                ? 'bg-[#1DB954] text-[#090909] hover:bg-[#1ed760] shadow-lg shadow-[#1DB954]/20'
                : 'bg-[#282828] text-[#727272] cursor-not-allowed'
            }`}
          >
            Create Playlist
          </motion.button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
