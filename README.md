# Iguana Garage

Web de un taller de chapa y pintura con dos partes:

- **Portfolio público** en `/`: trabajos publicados con sus fotos, galería ampliable y contacto por WhatsApp.
- **Gestión privada** en `/app` (instalable como PWA): el propietario crea, edita, publica y borra trabajos y fotos desde el móvil.

Producción: <https://iguana-garage.onrender.com> (Render). Cada push a `main` se despliega automáticamente.

## Documentación

| Archivo | Contenido |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Entrada para Claude Code; importa los tres siguientes. |
| [AGENTS.md](AGENTS.md) | Operación: stack, seguridad, autorizaciones, QA y Git. |
| [PRODUCT.md](PRODUCT.md) | Funciones, rutas, datos, imágenes y arquitectura actuales. |
| [DESIGN.md](DESIGN.md) | Identidad visual y dirección de diseño. |
| [supabase/README.md](supabase/README.md) | Base de datos, migraciones y su correspondencia con producción. |
| [docs/](docs/) | Informes de verificación de fases ya cerradas. Son históricos: no describen el estado actual ni contienen tareas pendientes. |

## Requisitos

Node 24 y npm 11 (`.node-version`). Las versiones exactas de las dependencias están en `package.json` y `package-lock.json`.

## Variables de entorno

Los archivos `.env.*.local` están ignorados por Git; solo se versionan las plantillas vacías.

| Archivo | Variables | Uso |
| --- | --- | --- |
| `.env.local` (plantilla `.env.example`) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `IGUANA_WHATSAPP_NUMBER` | Aplicación. Solo clave publicable, nunca `service_role`. WhatsApp en formato E.164 (`+34…`); sin valor válido la web muestra «contacto pendiente». |
| `.env.integration.local` | `SUPABASE_TEST_*` | Cuentas temporales de un proyecto de desarrollo dedicado para integración y E2E. |
| `.env.maintenance.local` | `IGUANA_MAINTENANCE_*`, `IGUANA_VARIANTS_ALLOW_WRITE` | Mantenimiento de variantes de imagen; escritura solo con autorización. |

## Comandos

```sh
npm ci                      # instalar dependencias
npm run dev                 # desarrollo
npm run typecheck           # tipos (genera antes los de Next)
npm run lint                # ESLint sin advertencias
npm test                    # tests unitarios (Vitest)
npm run test:coverage       # cobertura (objetivo: 80 % de la lógica comprobable)
npm run test:isolated       # DAL y RLS contra PostgreSQL aislado (PGlite)
npm run test:supabase       # integración contra el proyecto de pruebas dedicado
npm run test:e2e            # Playwright a 390/768/1440 px (tras npm run build)
npm run build && npm start  # producción local
```

## Tests: estado conocido

- Los E2E se ejecutan contra producción local en `127.0.0.1:3100` y necesitan `.env.integration.local`. Algunos crean y borran datos: solo contra el proyecto de pruebas, nunca contra producción.
- `e2e/public-portfolio.spec.ts` y `e2e/preproduction.spec.ts` todavía usan fotos de `assets/demo/`, carpeta eliminada a propósito. No pasarán hasta reescribirlos con fotos de prueba válidas; no recrear `assets/demo/`.
- Las comprobaciones de composición de la home en `e2e/public-portfolio.spec.ts` corresponden al diseño anterior y deben reescribirse con el rediseño del portfolio.

## Despliegue

Render Web Service con Node completo (SSR, Route Handlers y Sharp nativo); no es una exportación estática.

- Build: `npm ci --include=dev && npm run build`
- Start: `npm run start -- --hostname 0.0.0.0 --port $PORT`
- Variables: las dos `NEXT_PUBLIC_SUPABASE_*` en build y ejecución; `IGUANA_WHATSAPP_NUMBER` en ejecución.

Vercel no sirve: su límite de 4,5 MB por petición es incompatible con fotos de hasta 10 MiB procesadas en el servidor.

La CSP usa un nonce por petición con `strict-dynamic`; no relajarla ni habilitar `unsafe-inline` para scripts.

## Deuda técnica: ESLint 10

Se mantiene **ESLint 9.39.5**: `eslint-plugin-react`, `eslint-plugin-import` y `eslint-plugin-jsx-a11y`, cargados por `eslint-config-next`, no declaran compatibilidad con ESLint 10 (auditoría del 6 de octubre de 2026). No forzar peers ni retirar reglas. Se podrá actualizar cuando esos plugins y la configuración de Next lo admitan, verificando después todos los checks. Guía: <https://eslint.org/docs/latest/use/migrate-to-10.0.0>.
