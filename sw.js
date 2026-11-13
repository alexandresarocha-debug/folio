const VERSION = 'folio-v1.8.0';
const AUDIO_CACHE = 'folio-audio';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'data/cards.json', 'data/audio.json',
  'fonts/inter.woff2', 'fonts/newsreader.woff2', 'fonts/newsreader-italic.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

const cachedAudio = new Set();
const audioBlobs = new Map();
let audioIndexHydrated = false;
let hydratePromise = null;

function isFolioAudio(url) {
  if (!url.pathname.endsWith('.mp3')) return false;
  if (url.origin === 'https://cdn.jsdelivr.net') return url.pathname.startsWith('/gh/alexandresarocha-debug/folio-audio@');
  if (url.origin === 'https://raw.githubusercontent.com') return url.pathname.startsWith('/alexandresarocha-debug/folio-audio/');
  return false;
}

function hydrateAudioIndex() {
  if (!hydratePromise) {
    hydratePromise = caches.open(AUDIO_CACHE).then(c => c.keys()).then(keys => {
      keys.forEach(k => cachedAudio.add(k.url));
      audioIndexHydrated = true;
    }).catch(() => {});
  }
  return hydratePromise;
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // Drop old shell caches only. Played narration stays in folio-audio.
  // Saved cards and streaks are in localStorage and are not touched here.
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== AUDIO_CACHE).map(k => caches.delete(k))))
    .then(() => hydrateAudioIndex())
    .then(() => self.clients.claim()));
});

function audioHeaders(size, extra) {
  const headers = new Headers(extra || {});
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Content-Length', String(size));
  return headers;
}

function rangeResponse(blob, rangeHeader) {
  const size = blob.size;
  if (!rangeHeader) return new Response(blob, { status: 200, headers: audioHeaders(size) });
  if (rangeHeader.indexOf(',') !== -1) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  let start;
  let end;
  if (match[1] === '') {
    const suffix = parseInt(match[2], 10);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    }
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(match[1], 10);
    end = match[2] === '' ? size - 1 : parseInt(match[2], 10);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  end = Math.min(end, size - 1);
  const chunk = blob.slice(start, end + 1, 'audio/mpeg');
  const headers = audioHeaders(chunk.size);
  headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
  return new Response(chunk, { status: 206, statusText: 'Partial Content', headers });
}

async function cachedBlob(url) {
  if (audioBlobs.has(url)) return audioBlobs.get(url);
  const cache = await caches.open(AUDIO_CACHE);
  const hit = await cache.match(url);
  if (!hit) return null;
  const blob = await hit.blob();
  if (!blob || !blob.size) return null;
  audioBlobs.set(url, blob);
  cachedAudio.add(url);
  return blob;
}

async function audioResponse(req) {
  const blob = await cachedBlob(req.url);
  if (blob) return rangeResponse(blob, req.headers.get('range'));
  // Not cached: leave Range requests to the network so streaming still works.
  return fetch(req);
}

const audioInflight = new Set();
async function cacheAudio(raw) {
  let url;
  try { url = new URL(raw); } catch (e) { return; }
  if (!isFolioAudio(url)) return;
  const key = url.href;
  if (cachedAudio.has(key) || audioInflight.has(key)) return;
  audioInflight.add(key);
  try {
    const cache = await caches.open(AUDIO_CACHE);
    if (await cache.match(key)) { cachedAudio.add(key); return; }
    const res = await fetch(key, { method: 'GET', cache: 'no-store', credentials: 'omit' });
    if (!res || res.status !== 200) return;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (type.indexOf('audio') === -1 && type.indexOf('mpeg') === -1) return;
    const blob = await res.blob();
    if (!blob || !blob.size) return;
    const stored = new Response(blob, { status: 200, headers: audioHeaders(blob.size) });
    await cache.put(key, stored);
    audioBlobs.set(key, blob);
    cachedAudio.add(key);
  } finally {
    audioInflight.delete(key);
  }
}

self.addEventListener('message', e => {
  const data = e.data || {};
  if (data.type === 'cache-audio' && typeof data.url === 'string') {
    e.waitUntil(cacheAudio(data.url).catch(() => {}));
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isFolioAudio(url)) {
    if (!audioIndexHydrated) e.waitUntil(hydrateAudioIndex());
    if (audioIndexHydrated && !cachedAudio.has(url.href)) return;
    e.respondWith(audioResponse(req));
    return;
  }
  if (url.origin !== location.origin) return;
  // Content + navigations: network first (fresh ideas), fall back to cache offline
  if (req.mode === 'navigate' || url.pathname.endsWith('/data/cards.json')) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req.mode === 'navigate' ? 'index.html' : req, copy)); return res; })
      .catch(() => caches.match(req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true })));
    return;
  }
  // Static assets: cache first, then network (and store)
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
