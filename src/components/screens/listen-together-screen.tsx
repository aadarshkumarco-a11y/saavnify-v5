"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Radio,
  Plus,
  Share2,
  Send,
  LogOut,
  Copy,
  Check,
  Music,
  Play,
  Pause,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlayerStore } from '@/stores/player-store';
import { toast } from 'sonner';

// ---- Helpers ----

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ---- Types ----

interface Participant {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
}

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  ts: number;
  self?: boolean;
}

// ---- Mock Participants ----

const PARTICIPANT_NAMES = [
  'Aarav',
  'Priya',
  'Rahul',
  'Sneha',
  'Vikram',
  'Ananya',
];

const AVATAR_COLORS = [
  'from-[#1DB954] to-emerald-700',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-sky-500 to-cyan-600',
  'from-fuchsia-500 to-purple-600',
  'from-teal-500 to-emerald-700',
];

function pickParticipants(count: number): Participant[] {
  const shuffled = [...PARTICIPANT_NAMES].sort(() => Math.random() - 0.5);
  return Array.from({ length: count }).map((_, i) => ({
    id: `p-${i}`,
    name: shuffled[i % shuffled.length],
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    isHost: i === 0,
  }));
}

// ---- Avatar ----

function Avatar({
  name,
  color,
  size = 'md',
}: {
  name: string;
  color: string;
  size?: 'sm' | 'md';
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-semibold text-white shadow-lg`}
    >
      {initials}
    </div>
  );
}

// ---- Main Component ----

export function ListenTogetherScreen() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleCreateRoom = useCallback(() => {
    const code = generateRoomCode();
    const count = 3 + Math.floor(Math.random() * 3); // 3-5
    setRoomCode(code);
    setIsHost(true);
    setParticipants([
      {
        id: 'me',
        name: 'You',
        avatarColor: 'from-[#1DB954] to-emerald-700',
        isHost: true,
      },
      ...pickParticipants(count - 1).map((p) => ({ ...p, isHost: false })),
    ]);
    setMessages([
      {
        id: 'sys-1',
        author: 'System',
        text: `Room ${code} created. Share the code with friends to listen together!`,
        ts: Date.now(),
      },
    ]);
    toast.success('Room created', {
      description: `Code: ${code}`,
    });
  }, []);

  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error('Invalid code', {
        description: 'Room codes are 6 characters.',
      });
      return;
    }
    setRoomCode(code);
    setIsHost(false);
    const count = 3 + Math.floor(Math.random() * 3);
    setParticipants([
      {
        id: 'me',
        name: 'You',
        avatarColor: 'from-[#1DB954] to-emerald-700',
        isHost: false,
      },
      ...pickParticipants(count - 1).map((p) => ({ ...p, isHost: p.id === 'p-0' })),
    ]);
    setMessages([
      {
        id: 'sys-1',
        author: 'System',
        text: `Joined room ${code}. Playback is shared in this session.`,
        ts: Date.now(),
      },
    ]);
    setJoinCode('');
    toast.success('Joined room', { description: code });
  };

  const handleLeave = () => {
    setRoomCode(null);
    setParticipants([]);
    setMessages([]);
    setIsHost(false);
    toast('Left the room');
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast.success('Code copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        author: 'You',
        text,
        ts: Date.now(),
        self: true,
      },
    ]);
    setChatInput('');

    // Fake reply from another participant
    setTimeout(() => {
      const responder = participants.find((p) => p.id !== 'me');
      if (!responder) return;
      const replies = [
        'Nice track! 🔥',
        'Adding to my playlist.',
        'Who picked this? Love it.',
        'Next up should be something chill.',
        'Vibing 🎧',
      ];
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}-r`,
          author: responder.name,
          text: replies[Math.floor(Math.random() * replies.length)],
          ts: Date.now(),
        },
      ]);
    }, 1200 + Math.random() * 800);
  };

  // ---- Render ----

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
            <Users size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Listen Together
            </h1>
            <p className="text-xs text-[#B3B3B3]">
              Share the music. Share the moment.
            </p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!roomCode ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="grid sm:grid-cols-2 gap-4"
            >
              {/* Create Room Card */}
              <Card className="bg-[#181818] border-[#282828] p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#1DB954]/10 flex items-center justify-center mb-4">
                  <Plus size={26} className="text-[#1DB954]" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Create a Room</h3>
                <p className="text-xs text-[#B3B3B3] mb-5">
                  Start a new listening session and invite your friends with a
                  shareable code.
                </p>
                <Button
                  onClick={handleCreateRoom}
                  className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-full w-full"
                >
                  <Radio size={16} className="mr-2" /> Create Room
                </Button>
              </Card>

              {/* Join Room Card */}
              <Card className="bg-[#181818] border-[#282828] p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <Users size={26} className="text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Join a Room</h3>
                <p className="text-xs text-[#B3B3B3] mb-5">
                  Have a code from a friend? Enter it below to join their
                  listening session.
                </p>
                <div className="flex gap-2 w-full">
                  <Input
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    placeholder="ABC123"
                    className="bg-[#222222] border-[#282828] text-white text-center tracking-widest font-semibold uppercase"
                    aria-label="Room code"
                  />
                  <Button
                    onClick={handleJoinRoom}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-full"
                  >
                    Join
                  </Button>
                </div>
              </Card>

              {/* Info banner */}
              <div className="sm:col-span-2 bg-[#181818] border border-[#282828] rounded-2xl p-4 flex items-start gap-3">
                <Wifi size={18} className="text-[#1DB954] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Demo Mode</p>
                  <p className="text-xs text-[#B3B3B3] mt-0.5">
                    Listen Together in Saavnify v5 is a UI demo — playback is
                    shared in this session only, with simulated participants &
                    chat. A real-time backend can be wired in later via
                    WebSocket.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="room"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4"
            >
              {/* Room Code Card */}
              <Card className="bg-gradient-to-br from-[#1DB954]/10 to-[#181818] border-[#1DB954]/30 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-[#B3B3B3] uppercase tracking-wide">
                      Room Code
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-3xl font-bold tracking-[0.3em] text-[#1DB954]">
                        {roomCode}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyCode}
                        aria-label="Copy room code"
                        className="rounded-full hover:bg-[#1DB954]/10 hover:text-[#1DB954] h-9 w-9"
                      >
                        {copied ? (
                          <Check size={16} className="text-[#1DB954]" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="rounded-full bg-transparent border-[#1DB954]/40 text-[#1DB954] hover:bg-[#1DB954]/10 hover:text-[#1DB954]"
                  >
                    <Share2 size={14} className="mr-1.5" /> Share code
                  </Button>
                </div>
              </Card>

              {/* Now Playing Card */}
              <Card className="bg-[#181818] border-[#282828] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Music size={14} className="text-[#1DB954]" />
                    <span className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                      Now Playing (Synced)
                    </span>
                  </div>
                  <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] mr-1.5 animate-pulse" />
                    Live
                  </Badge>
                </div>
                {currentTrack ? (
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[#222222]">
                      {currentTrack.thumbnail ? (
                        <img
                          src={currentTrack.thumbnail}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={20} className="text-[#1DB954]/60" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {truncate(currentTrack.title, 40)}
                      </p>
                      <p className="text-xs text-[#B3B3B3] truncate">
                        {truncate(currentTrack.artist, 30)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlayPause}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black h-10 w-10"
                    >
                      {isPlaying ? (
                        <Pause size={18} fill="currentColor" />
                      ) : (
                        <Play size={18} fill="currentColor" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-[#B3B3B3] py-2">
                    No track playing. Start something on your device — everyone
                    in the room will follow along.
                  </div>
                )}
                <p className="text-[10px] text-[#727272] mt-3">
                  Playback is shared in this session.
                </p>
              </Card>

              {/* Participants */}
              <Card className="bg-[#181818] border-[#282828] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#1DB954]" />
                    <span className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                      Participants ({participants.length})
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#222222] transition-colors"
                    >
                      <Avatar name={p.name} color={p.avatarColor} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-[11px] text-[#B3B3B3]">
                          {p.isHost ? 'Host' : 'Listener'}
                        </p>
                      </div>
                      {p.id === 'me' && (
                        <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-0">
                          You
                        </Badge>
                      )}
                      {p.isHost && p.id !== 'me' && (
                        <Badge className="bg-orange-500/10 text-orange-400 border-0">
                          Host
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Chat */}
              <Card className="bg-[#181818] border-[#282828] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                    Chat
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {messages.length === 0 && (
                    <p className="text-xs text-[#727272] text-center py-6">
                      No messages yet. Say hi! 👋
                    </p>
                  )}
                  {messages.map((m) => {
                    const isSelf = m.self || m.author === 'You';
                    const isSystem = m.author === 'System';
                    if (isSystem) {
                      return (
                        <div
                          key={m.id}
                          className="text-center text-[11px] text-[#727272] py-1.5"
                        >
                          {m.text}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isSelf ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                            isSelf
                              ? 'bg-[#1DB954] text-black rounded-br-sm'
                              : 'bg-[#222222] text-white rounded-bl-sm'
                          }`}
                        >
                          {!isSelf && (
                            <p className="text-[10px] font-semibold text-[#1DB954] mb-0.5">
                              {m.author}
                            </p>
                          )}
                          <p className="text-sm">{m.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2 mt-3">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && handleSendMessage()
                    }
                    placeholder="Type a message…"
                    className="bg-[#222222] border-[#282828] text-white"
                    aria-label="Chat message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full"
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </Card>

              {/* Leave Button */}
              <Button
                onClick={handleLeave}
                variant="outline"
                className="w-full rounded-full bg-transparent border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut size={16} className="mr-2" /> Leave Room
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
