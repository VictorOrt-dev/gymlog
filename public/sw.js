// Service worker : l'app s'ouvre même au sous-sol sans réseau, ET se met à jour dès qu'il y a du réseau.
// Stratégie (page) : réseau d'abord, avec 3 s de patience ; sinon le cache. Fichiers du build (noms uniques) : cache d'abord.
// Pourquoi pas « cache d'abord » pour la page : sur iPhone, la mise à jour en arrière-plan est coupée quand on ferme l'app,
// et la nouvelle version n'arrivait jamais.
const PREFIX = 'gymlog-';
const CACHE = `${PREFIX}v3`;
const NETWORK_WAIT = 3000;
const abs = (path) => new URL(path, self.registration.scope).href;
// Les fichiers ont des noms uniques par version : on ignore l'en-tête Vary (sinon un fichier bien rangé peut être « introuvable » hors ligne).
const match = (req) => caches.match(req, { ignoreVary: true });

/** Range une version complète : ses fichiers indispensables d'abord, la page ensuite, puis purge de l'ancienne. */
async function store(res) {
  const cache = await caches.open(CACHE);
  const html = await res.clone().text();
  const files = [...new Set([...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => abs(m[1])))];
  const critical = files.filter((f) => /\/assets\//.test(f)); // JS et CSS : sans eux, pas d'app hors ligne
  const missing = [];
  for (const f of critical) if (!(await cache.match(f, { ignoreVary: true }))) missing.push(f); // noms uniques par build : déjà là = à jour
  await cache.addAll(missing);
  await Promise.allSettled(files.filter((f) => !critical.includes(f)).map(async (f) => (await cache.match(f, { ignoreVary: true })) || cache.add(f))); // icônes, écrans de démarrage : un échec ne bloque rien
  await cache.put(abs('./'), res);
  const keep = new Set([...files, abs('./')]);
  for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    fetch(abs('./'), { cache: 'no-cache' })
      .then((r) => r.ok && store(r))
      .catch(() => {}),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name); // anciennes versions
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  if (request.mode === 'navigate') {
    const net = fetch(abs('./'), { cache: 'no-cache' });
    // La version reçue est rangée pour le hors-ligne, même si elle arrive après les 3 s.
    e.waitUntil(net.then((r) => r.ok && store(r.clone())).catch(() => {}));
    e.respondWith(
      (async () => {
        try {
          const res = await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('lent')), NETWORK_WAIT))]);
          if (res.ok) return res;
        } catch {
          /* hors ligne ou réseau trop lent : le cache prend le relais */
        }
        return (await match(abs('./'))) || net;
      })(),
    );
    return;
  }
  e.respondWith(match(request).then((hit) => hit || fetch(request)));
});
