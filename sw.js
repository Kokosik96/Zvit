const CACHE = 'zvitfpv-v5';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

// cache:'reload' — беремо файли з мережі, а не з кешу браузера (якщо браузер не вміє — просто адреса)
const fresh = u => { try { return new Request(u, { cache: 'reload' }); } catch (e) { return u; } };

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES.map(fresh)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'));
}

// index.html: спочатку мережа (щоб підтягувати оновлення), офлайн — з кеша.
// Якщо сайт віддав помилку (404, 500, редірект) — показуємо збережену версію і помилку НЕ кешуємо.
// Решта файлів: з кеша одразу.
self.addEventListener('fetch', e => {
  const isPage = e.request.mode === 'navigate' || e.request.url.endsWith('index.html');
  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok && r.type === 'basic') {
            const copy = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
            return r;
          }
          return fromCache(e.request).then(c => c || r);
        })
        .catch(() => fromCache(e.request).then(c => c || Response.error()))
    );
  } else {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))
    );
  }
});
