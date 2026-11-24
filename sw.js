// Survey Pro – offline support.
// Keeps a copy of the app on the device so it opens and works with no signal (e.g. in plant rooms).
// Assessments themselves are saved on the device by the app and synced when back online.
const CACHE = 'surveypro-20261124122524';
const CORE = ['./', './index.html', './training-examples.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const put = (req, res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
// Try the network (so updates arrive), but give up after a few seconds on poor signal and use the saved copy.
const networkFirst = req => Promise.race([
  fetch(req).then(res => put(req, res)),
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
]).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')));
const cacheFirst = req => caches.match(req).then(r => r || fetch(req).then(res => put(req, res)));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(req));      // the app itself
  else if (url.hostname === 'esm.sh') e.respondWith(cacheFirst(req));             // code libraries (Supabase, Claude)
  // everything else (Supabase data, photos, Claude) always goes to the network
});
