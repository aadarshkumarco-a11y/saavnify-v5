// ---- API Key Manager ----
// Secure storage and validation of YouTube Data API v3 key
// Users must provide their own API key - no hardcoded keys

const STORAGE_KEY = 'saavnify-api-key';
const VALIDATED_KEY = 'saavnify-api-key-validated';

// Simple obfuscation (not true encryption - for production use Android Keystore)
function encode(key: string): string {
  try {
    return btoa(encodeURIComponent(key));
  } catch {
    return btoa(key);
  }
}

function decode(encoded: string): string {
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    try { return atob(encoded); } catch { return ''; }
  }
}

export interface ApiKeyStatus {
  hasKey: boolean;
  isValid: boolean | null; // null = not yet validated
  lastValidated: number | null;
  keyPreview: string; // First 4 + last 4 chars
}

export function getApiKey(): string | null {
  try {
    const encoded = localStorage.getItem(STORAGE_KEY);
    if (!encoded) return null;
    return decode(encoded);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, encode(key));
  } catch {
    // Storage not available
  }
}

export function removeApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VALIDATED_KEY);
  } catch {
    // Storage not available
  }
}

export function setKeyValidated(valid: boolean): void {
  try {
    localStorage.setItem(VALIDATED_KEY, JSON.stringify({ valid, timestamp: Date.now() }));
  } catch {
    // Storage not available
  }
}

export function getKeyStatus(): ApiKeyStatus {
  const key = getApiKey();
  if (!key) {
    return { hasKey: false, isValid: null, lastValidated: null, keyPreview: '' };
  }

  let validationData: { valid: boolean; timestamp: number } | null = null;
  try {
    const raw = localStorage.getItem(VALIDATED_KEY);
    if (raw) validationData = JSON.parse(raw);
  } catch {}

  const preview = key.length > 8
    ? `${key.slice(0, 4)}${'*'.repeat(Math.min(key.length - 8, 24))}${key.slice(-4)}`
    : '****';

  return {
    hasKey: true,
    isValid: validationData?.valid ?? null,
    lastValidated: validationData?.timestamp ?? null,
    keyPreview: preview,
  };
}

// Validate API key by making a lightweight test request to YouTube Data API
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  error?: string;
  quotaAvailable?: boolean;
}> {
  if (!key || key.trim().length < 20) {
    return { valid: false, error: 'API key is too short. YouTube API keys are typically 39 characters.' };
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('key', key.trim());
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('maxResults', '1');
    url.searchParams.set('videoCategoryId', '10');

    const response = await fetch(url.toString());

    if (response.ok) {
      setApiKey(key.trim());
      setKeyValidated(true);
      return { valid: true, quotaAvailable: true };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as { error?: { message?: string; errors?: Array<{ reason?: string }> } })?.error?.message || '';
    const errorReason = (errorData as { error?: { errors?: Array<{ reason?: string }> } })?.error?.errors?.[0]?.reason || '';

    if (response.status === 400 || errorReason === 'keyInvalid') {
      return { valid: false, error: 'Invalid API key. Please check your key and try again.' };
    }

    if (response.status === 403) {
      if (errorReason === 'forbidden' || errorReason === 'dailyLimitExceeded') {
        return { valid: false, error: 'API quota exceeded. Your key has reached its daily limit.' };
      }
      if (errorReason === 'ipRefererBlocked') {
        // Key works but restricted - still valid
        setApiKey(key.trim());
        setKeyValidated(true);
        return { valid: true, quotaAvailable: true };
      }
      return { valid: false, error: `API access denied: ${errorMessage}` };
    }

    return { valid: false, error: `API error (${response.status}): ${errorMessage}` };
  } catch (err) {
    return { valid: false, error: `Network error: ${(err as Error).message}. Check your internet connection.` };
  }
}

// Test the currently stored API key
export async function testCurrentKey(): Promise<{
  valid: boolean;
  error?: string;
}> {
  const key = getApiKey();
  if (!key) {
    return { valid: false, error: 'No API key configured.' };
  }
  const result = await validateApiKey(key);
  if (!result.valid) {
    setKeyValidated(false);
  }
  return result;
}
