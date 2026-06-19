// ============================================================
// Saavnify InnerTube CORS Proxy
// Cloudflare Worker — forwards browser POST/GET requests to
// YouTube's private InnerTube API (music.youtube.com/youtubei/v1/*)
// and adds permissive CORS headers so the browser can read responses.
//
// Deploy:
//   1. Install wrangler:  npm i -g wrangler
//   2. Login:              wrangler login
//   3. Deploy:             wrangler deploy
//   4. Copy the worker URL (e.g. https://saavnify-innertube.<your-sub>.workers.dev)
//   5. In the app, call setInnertubeProxyUrl('<your-worker-url>')
//      OR change the default in src/lib/sources/innertube-api.ts
// ============================================================

const YT_BASE = 'https://music.youtube.com/youtubei/v1/';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'https://localhost',
  // Add your production origin(s) here, e.g.
  // 'https://saavnify.app',
]);

// Allowlist of InnerTube endpoints we proxy (defense in depth)
const ALLOWED_ENDPOINTS = new Set([
  'search',
  'player',
  'browse',
  'next',
  'get_transcript',
  'music/get_search_suggestions',
  'music/get_queue',
  'account/account_menu',
  'like/like',
  'like/removelike',
  'subscription/subscribe',
  'subscription/unsubscribe',
  'browse/edit_playlist',
  'playlist/create',
  'playlist/delete',
]);

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    const url = new URL(request.url);
    const endpoint = url.pathname.replace(/^\/+/, '');

    if (!endpoint) {
      return json({ ok: true, service: 'saavnify-innertube-proxy' });
    }

    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return json({ error: `Endpoint not allowed: ${endpoint}` }, 403);
    }

    // Forward to YouTube
    const upstreamUrl = `${YT_BASE}${endpoint}${url.search}`;
    try {
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers: sanitizeRequestHeaders(request.headers),
        body: request.method === 'POST' ? await request.text() : undefined,
      });

      const responseBody = await upstream.text();
      return new Response(responseBody, {
        status: upstream.status,
        headers: {
          ...corsHeaders(request),
          'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        },
      });
    } catch (error) {
      return json(
        { error: error?.message || 'Upstream fetch failed' },
        502
      );
    }
  },
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  // Allow all origins in dev; tighten to ALLOWED_ORIGINS in production
  const allowOrigin = ALLOWED_ORIGINS.size > 0 && !ALLOWED_ORIGINS.has(origin)
    ? ''
    : origin || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Goog-Api-Format-Version, X-YouTube-Client-Name, X-YouTube-Client-Version, User-Agent, Authorization, Origin',
    'Access-Control-Max-Age': '86400',
  };
}

function sanitizeRequestHeaders(headers) {
  // Strip browser-injected headers that would leak identity / break the upstream
  const stripped = new Headers(headers);
  stripped.delete('Host');
  stripped.delete('Origin');
  stripped.delete('Referer');
  stripped.delete('Cookie');
  stripped.delete('Sec-Fetch-Mode');
  stripped.delete('Sec-Fetch-Site');
  stripped.delete('Sec-Fetch-Dest');
  return stripped;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
