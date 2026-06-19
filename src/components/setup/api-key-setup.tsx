'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, CheckCircle, XCircle, Eye, EyeOff, ExternalLink, Loader2, Shield } from 'lucide-react';
import { validateApiKey, getApiKey } from '@/lib/api-key-manager';

interface ApiKeySetupProps {
  onComplete: () => void;
}

export function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  const existingKey = getApiKey();

  const handleValidate = async () => {
    if (!keyInput.trim()) return;
    setValidating(true);
    setValidationResult(null);
    const result = await validateApiKey(keyInput.trim());
    setValidationResult(result);
    setValidating(false);
    if (result.valid) {
      setTimeout(onComplete, 800);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleUseExisting = () => {
    if (existingKey) {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#090909] text-white p-6 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-3xl font-extrabold tracking-tight text-[#1DB954] mb-2"
      >
        SAAVNIFY
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-[#B3B3B3] text-sm mb-8"
      >
        Premium Music Streaming
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md bg-[#181818] rounded-2xl p-6 border border-[#282828]"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#1DB954]/15 flex items-center justify-center">
            <Key size={18} className="text-[#1DB954]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">API Key Setup</h2>
            <p className="text-xs text-[#B3B3B3]">Required for YouTube Music access</p>
          </div>
        </div>

        <div className="bg-[#121212] rounded-xl p-4 mb-5">
          <p className="text-sm text-[#B3B3B3] leading-relaxed">
            SAAVNIFY uses the <strong className="text-white">YouTube Data API v3</strong> to search and stream music.
            You need your own API key to use the app.
          </p>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#1DB954] text-xs font-medium mt-3 hover:underline"
          >
            Get your free API key <ExternalLink size={12} />
          </a>
        </div>

        {existingKey && (
          <div className="bg-[#1DB954]/10 rounded-xl p-3 mb-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-[#1DB954] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-white">API key already configured</p>
              <p className="text-[10px] text-[#B3B3B3]">You can use the existing key or update it</p>
            </div>
            <button
              onClick={handleUseExisting}
              className="px-3 py-1.5 bg-[#1DB954] text-white text-xs font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-[#B3B3B3] mb-2">
            YouTube Data API v3 Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setValidationResult(null);
              }}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 pr-10 bg-[#121212] border border-[#282828] rounded-xl text-white text-sm placeholder-[#727272] focus:outline-none focus:border-[#1DB954] transition-colors"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#727272] hover:text-white transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {validationResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`rounded-xl p-3 mb-4 flex items-start gap-2 ${
              validationResult.valid
                ? 'bg-[#1DB954]/10 border border-[#1DB954]/20'
                : 'bg-[#E91429]/10 border border-[#E91429]/20'
            }`}
          >
            {validationResult.valid ? (
              <CheckCircle size={16} className="text-[#1DB954] flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle size={16} className="text-[#E91429] flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-xs font-medium ${validationResult.valid ? 'text-[#1DB954]' : 'text-[#E91429]'}`}>
                {validationResult.valid ? 'API Connected' : 'Invalid API Key'}
              </p>
              {validationResult.error && (
                <p className="text-[10px] text-[#B3B3B3] mt-0.5">{validationResult.error}</p>
              )}
            </div>
          </motion.div>
        )}

        <button
          onClick={handleValidate}
          disabled={!keyInput.trim() || validating}
          className="w-full py-3 bg-[#1DB954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {validating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Shield size={16} />
              Validate &amp; Connect
            </>
          )}
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-2 mt-3 text-[#727272] text-xs hover:text-white transition-colors"
        >
          Skip for now (limited features)
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-[10px] text-[#727272] text-center mt-6 max-w-xs"
      >
        Your API key is stored locally on your device and is never sent to any server other than Google&apos;s API.
      </motion.p>
    </div>
  );
}
