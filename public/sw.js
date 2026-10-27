/**
 * FAMA — Service Worker Oficial (PWA)
 * RENACER CHURCH
 *
 * Directivas de Seguridad:
 * - NO almacenar en caché APIs autenticadas (/api/*).
 * - NO almacenar en caché datos privados, financieros, notas pastorales ni tokens.
 * - Estrategia Network-First para páginas HTML con fallback a /offline.
 * - Estrategia Stale-While-Revalidate para recursos estáticos públicos.
 */

const CACHE_VERSION = 'fama-pwa-v1.0.0';
const STATIC_CACHE = `fama-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fama-dynamic-${CACHE_VERSION}`;

// Recursos esenciales pre-cacheados en la instalación
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/badge-72x72.png',
  '/favicon.ico',
];

// URLs y dominios que NUNCA deben ser almacenados en caché por seguridad
const NEVER_CACHE_URL_PATTERNS = [
  /\/api\//,                           // Todas las API routes del backend
  /\/admin/,                           // Panel pastoral y administrativo sensible
  /identitytoolkit\.googleapis\.com/,  // Firebase Auth
  /securetoken\.googleapis\.com/,      // Firebase Auth Tokens
  /firestore\.googleapis\.com/,        // Cloud Firestore directo
  /www\.googleapis\.com/,              // Google APIs
  /googlevideo\.com/,                  // Streaming de video
  /\.m3u8$/,                           // Listas de reproducción de streaming
  /\.ts$/,                             // Segmentos de video HLS
];

// 1. INSTALACIÓN
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW FAMA] Error durante el precaching:', err);
      })
  );
});

// 2. ACTIVACIÓN Y LIMPIEZA DE VERSIONES ANTERIORES
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name.startsWith('fama-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. ESTRATEGIA DE INTERCEPTACIÓN (FETCH)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Solo interceptar peticiones GET
  if (request.method !== 'GET') {
    return;
  }

  // Comprobar si la URL coincide con patrones prohibidos para caché
  const isNeverCache = NEVER_CACHE_URL_PATTERNS.some((pattern) => pattern.test(url.href) || pattern.test(url.pathname));
  if (isNeverCache) {
    return;
  }

  // A. Peticiones de navegación (Páginas HTML): NETWORK-FIRST con fallback a /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Si la respuesta es válida y no es ruta administrativa/privada, se puede actualizar el shell
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            // Evitar guardar /perfil en caché pública compartida
            if (!url.pathname.startsWith('/perfil') && !url.pathname.startsWith('/admin')) {
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          }
          return networkResponse;
        })
        .catch(async () => {
          // Sin conexión: intentar caché local previa o mostrar la página de fallback offline
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const offlineFallback = await caches.match('/offline');
          if (offlineFallback) {
            return offlineFallback;
          }
          return new Response('Sin conexión a internet. Por favor reintenta cuando tengas conexión.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // B. Recursos estáticos (JS, CSS, Imágenes, Fuentes, Iconos): STALE-WHILE-REVALIDATE
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // C. Para el resto de peticiones: ir directamente a la red
  event.respondWith(fetch(request));
});

// 4. MENSAJERÍA ENTRE CLIENTE Y SERVICE WORKER (Actualizaciones instantáneas)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 5. NOTIFICACIONES PUSH DEL SISTEMA OPERATIVO
self.addEventListener('push', (event) => {
  let data = {
    title: 'FAMA — Renacer Church',
    body: 'Nuevo comunicado congregacional disponible.',
    url: '/perfil?tab=notificaciones',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/perfil?tab=notificaciones',
    },
    actions: [
      { action: 'open', title: 'Ver Notificación' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 6. CLIC EN NOTIFICACIÓN PUSH
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/perfil?tab=notificaciones';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una pestaña abierta de FAMA, enfocarla y navegar
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Si no hay pestaña abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
