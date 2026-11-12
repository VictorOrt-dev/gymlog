// Service worker minimal : l'app s'ouvre instantanément, même au sous-sol sans réseau.
// Stratégie : on sert le cache tout de suite, on met à jour en arrière-plan, et on purge ce qui est périmé.
const PREFIX = 'gymlog-';
const CACHE = `${PREFIX}v2`;
const abs = (path) => new URL(path, self.registration.scope).href;

async function refresh() {
  const cache = await caches.open(CACHE);
  const res = await fetch('./', { cache: 'no-cache' });
  if (!res.ok) return;
  const html = await res.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => abs(m[1]));
  await cache.addAll(assets); // d'abord les fichiers du nouveau build…
  await cache.put('./', res); // …puis seulement le HTML qui les référence
  // Purge : tout fichier qui n'appartient plus à la version courante est supprimé (pas d'accumulation).
  const keep = new Set([...assets, abs('./')]);
  for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(refresh().catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Anciens caches GymLog (versions précédentes du service worker) : supprimés.
      for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

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
