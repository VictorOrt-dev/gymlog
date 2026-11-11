// Service worker minimal : l'app s'ouvre instantanément, même au sous-sol sans réseau.
// Stratégie : on sert le cache tout de suite, on met à jour en arrière-plan.
const CACHE = 'gymlog-v1';

async function refresh() {
  const cache = await caches.open(CACHE);
  const res = await fetch('./', { cache: 'no-cache' });
  if (!res.ok) return;
  const html = await res.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(assets); // d'abord les assets du nouveau build…
  await cache.put('./', res); // …puis seulement le HTML qui les référence
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(refresh().catch(() => {}));
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  if (request.mode === 'navigate') {
    e.respondWith(caches.match('./').then((hit) => hit || fetch(request)));
    e.waitUntil(refresh().catch(() => {}));
    return;
  }
  e.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
