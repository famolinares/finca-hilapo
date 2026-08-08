/* Service Worker de Finca Hilapo.
   Trabajo: dejar guardada una copia de la página (el "cascarón" de la
   app: index.html + el script de Supabase) para que si el celular se
   queda sin señal justo cuando alguien abre la app, igual cargue con
   la última versión que se alcanzó a ver. Todo lo demás (las llamadas
   a Supabase para leer/guardar datos) sigue yendo directo a internet:
   este archivo NO guarda datos de la finca, solo la página en sí. */

const CACHE = 'fh-cascaron-v1';
const CASCARON = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  /* guardamos cada archivo por separado: si uno falla (por ejemplo el
     script externo de Supabase, que depende de otro servidor), los
     demás igual quedan guardados. Con addAll(), uno solo que fallara
     tumbaba TODO el paquete y no quedaba nada en caché. */
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(CASCARON.map((url) => c.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // nunca tocar guardados/subidas a Supabase

  const esCascaron =
    req.mode === 'navigate' ||
    req.url === self.location.origin + '/' ||
    req.url.endsWith('/index.html') ||
    req.url.indexOf('supabase-js') !== -1;
  if (!esCascaron) return; // todo lo demás (Supabase, fotos, etc.) va directo a la red

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
  );
});
