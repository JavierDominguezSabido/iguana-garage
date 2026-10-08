# PWA privada de Iguana Garage

La instalación se anuncia exclusivamente desde `/app`, incluido `/app/login`,
mediante su metadata de Next.js. El layout raíz y el portfolio `/` no enlazan
el manifest ni anuncian una aplicación Apple. No se añaden botones ni navegación.

`public/pwa/manifest.webmanifest` es público y estático: solo contiene identidad,
iconos y configuración de lanzamiento, nunca sesión o datos. Abrir la aplicación
instalada inicia `/app`; el guard SSR redirige a `/app/login` si no hay sesión.
El login correcto vuelve a `/app`; logout vuelve a `/app/login`.

## Scope privado y login

`scope: "/app"` incluye el lanzamiento exacto `/app` y `/app/login`; excluye `/`.
Se omite la barra final porque `/app/` excluiría el start_url exacto `/app`.
El matching estándar es por prefijo: también incluiría futuros nombres como
`/application`, que no existen en la aplicación. El namespace de la experiencia
privada continúa siendo `/app`; el scope no sustituye ninguna autorización.

`src/app/app/layout.tsx` comparte únicamente metadata. `(workspace)/layout.tsx`
conserva el guard SSR, header, footer y estructura privada anterior. El route group
no cambia ninguna URL de trabajos, detalle, alta o edición. Los handlers API
permanecen donde estaban y mantienen su autorización por operación.

El único formulario y página de login pasan a `/app/login`, fuera del layout
autenticado. El Proxy valida Auth también en login, pero solo la ruta exacta
`/app/login` puede mostrarse sin sesión; `/app/login/extra` y cualquier otra
superficie privada siguen protegidas. No cambian cookies, credenciales, Supabase
Auth, RLS o Storage. Todas las redirecciones por sesión perdida y logout son
directas a `/app/login`, sin salir del scope ni crear bucles.

`/login` es exclusivamente una redirección de compatibilidad a `/app/login`,
sin duplicar formulario o lógica. La home queda fuera de la PWA y sin promoción;
el navegador conserva su propia capacidad de instalar cualquier web. Una salida
explícita al portfolio está fuera del scope y puede mostrar UI del navegador.

## Instalación y conectividad

En producción se requiere HTTPS. Abrir `/app/login` o `/app` en Chrome/Android y usar
su opción de instalar aplicación. En Safari/iOS: Compartir → Añadir a pantalla
de inicio. La disponibilidad y presentación exactas dependen del navegador/OS;
no se garantiza un banner automático ni `beforeinstallprompt`.

Sin service worker, precache, sincronización offline, notificaciones ni plugins
PWA. Chromium permite instalación desde su menú sin un fetch handler de service
worker. Sin conexión no se sirven copias offline de trabajos o fotos; se mantiene
`private, no-store` en HTML/API/imágenes privadas. No se añaden almacenes de
credenciales ni tokens: la sesión usa exclusivamente el mecanismo Auth existente.

## Iconos

Solo `assets/brand/iguana-garage-symbol.png`, intacto. Los cuatro derivados están
en `public/pwa/`: PNG 192 y 512, PNG maskable 512 con margen de seguridad y Apple
180. Todos mantienen proporciones y colores del arte sobre Carbon `#0E1110`.
El favicon existente no cambia. Regeneración técnica explícita:

```sh
node scripts/prepare-pwa-icons.mjs
```

## Verificación local

Next.js 16.3.8 genera `mobile-web-app-capable`, el título/status bar Apple y su
touch icon a partir de `appleWebApp`; no se inyecta manualmente metadata legacy.
Chrome 154.0.8037.98 interpreta el manifest sin errores y devuelve cero errores
de instalación en un perfil QA fuera de incógnito. No requiere service worker.
El modo incógnito deniega instalación por su propia restricción.

QA en 390, 768 y 1440: login/logout reales, guard SSR, reapertura con/sin sesión,
alta/edición sin guardar, detalle, galería y visor; sin escrituras en jobs/media.
No se verifica CRUD nuevo porque la PWA no modifica esa lógica. Las imágenes
mantienen `private, no-store`, y una descarga de foto privada sin conexión falla
sin servir copia offline. Cero service workers y cero Cache Storage.

Estas pruebas comprueban lanzamiento/reapertura mediante navegación y cookies
del navegador, no una instalación nativa. La instalación, las barras del sistema
y la reapertura desde un icono de Android/iOS físico quedan pendientes de QA
humano tras publicar por HTTPS. No se ha desplegado ni hecho commit de esta fase.

## Fuentes verificadas

- [Next.js: metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js: PWA](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js: route groups sin alterar URLs](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [MDN: scope y coincidencia por prefijo](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope)
- [Chrome: instalación desde menú sin fetch handler](https://developer.chrome.com/blog/update-install-criteria)
