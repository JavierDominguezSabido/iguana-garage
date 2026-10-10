# Iguana Garage — guía operativa

## Estado y fuentes

Aplicación real desplegada en **Render**, con portfolio público y gestión privada/PWA. Esta guía es común a Codex, Claude Code y futuros agentes: leerla junto con [PRODUCT.md](PRODUCT.md) y [DESIGN.md](DESIGN.md) antes de actuar. En Claude Code, `CLAUDE.md` importa los tres documentos para que se carguen en cada sesión.

- **AGENTS.md:** operación, seguridad, autorizaciones y QA.
- **PRODUCT.md:** funciones, rutas, datos y arquitectura actuales.
- **DESIGN.md:** identidad, composición y criterios visuales.
- Código, configuración, tests y Git contrastan las afirmaciones. README e informes de `docs/` contienen también estados históricos; no convertir sus pendientes antiguos en tareas ni copiarlos como estado actual. Mantener estos tres documentos al cambiar sus contratos.

## Stack real

Next.js **16.3.8** (App Router), React/React DOM **19.3.0**, TypeScript **6.0.3** strict, Tailwind CSS **4.3.3**. Node **24.x** (local 24.18.0), npm **11.x** (11.16.0); alias `@/* → src/*`.

Supabase JS **2.117.2**, SSR **0.12.7**, Sharp **0.35.5**; Vitest **5.0.3**, Playwright **1.63.0**, PGlite **0.5.8** para PostgreSQL aislado. ESLint **9.39.5** y eslint-config-next **16.3.8**: ESLint 9 es deuda temporal por peers de plugins; no forzar ESLint 10. Versiones y resolución: `package.json`/`package-lock.json`; revisarlas antes de actualizar, sin fijar versiones por memoria.

## Workflow proporcional

1. Inspeccionar instrucciones, estado Git y archivos relevantes antes de actuar.
2. Diagnosticar o planificar según el riesgo; concretar alcance y aceptación sin inventar funciones.
3. Para cambios de comportamiento: prueba en rojo observada → cambio mínimo → la misma prueba en verde → revisión del diff y verificación proporcional.
4. Informar evidencia real y límites; no declarar PASS de checks no ejecutados.

La dirección visual y la aceptación solo se abordan cuando procedan. Esta guía es independiente de plugins y herramientas concretas: no asumir comandos propios de un agente en otro, ni activar agentes o ejecutar suites sin necesidad. Los cambios documentales requieren coherencia con el código y los otros documentos, revisión del diff y `git diff --check`; no tests artificiales ni suites de aplicación.

## Contratos que deben preservarse

- **Público:** `/`, sin enlace de login ni manifest PWA. Cliente Supabase anónimo independiente de cookies; RPC/proyección limitada a trabajos `is_public=true`, sin acceso anónimo general a tablas ni originales.
- **Privado:** `/app`, `/app/new`, `/app/jobs/[id]`, `/app/jobs/[id]/edit`. Sesión validada en servidor y autorización por operación, además de RLS por propietario. `/app/login` es la única excepción anónima del guard y el único formulario real.
- **Compatibilidad:** `/login` devuelve HTTP 307 a `/app/login` desde `src/proxy.ts`; no recrear una página React en esa ruta. `(workspace)` agrupa la gestión sin cambiar URLs.
- **PWA privada:** `scope=/app`, `start_url=/app`, `display=standalone`. Manifest enlazado solo por el layout de `/app`, incluido login; `/` queda fuera. Sin service worker ni caché/offline de contenido privado.
- **Seguridad:** Auth servidor, RLS y ambos buckets privados. CSP con nonce por petición y `strict-dynamic`; no habilitar `unsafe-inline` para scripts, retirar nonces ni relajar políticas. Datos/imágenes revocables mantienen `private, no-store` y CDN `no-store` donde está configurado.
- **Imágenes:** originales privados intactos; master WebP legacy hasta 1600 px en `job_uuid/media_uuid.webp`; sidecars exclusivamente `job_uuid/media_uuid/{320,390,640,768}.webp`. Preparación en subida; entrega normal de bytes preparados sin Sharp. Existen fallbacks legacy explícitos para variantes ausentes; no generalizarlos ni volver al procesamiento normal por request.
- Mantener `server-only` en entradas de aplicación. `src/features/jobs/server/media.ts` es interno de Node para DAL/mantenimiento, no client-safe; respetar su guard y la restricción ESLint de imports.

## Autorización y producción

Producción: `https://iguana-garage.onrender.com`, Supabase Iguana Garage `atibisongftmspwtyndv`, con datos reales. No tocar LiftTrack. Render es un Web Service Node completo; el push autorizado a `main` dispara su despliegue automático.

Requieren autorización explícita aplicable: cambios de alcance/diseño, dependencias/configuración funcional, migraciones/policies, Auth/usuarios/URLs, variables remotas, backfill, fixtures remotos, cambios de Render, commits/push y despliegues. Una autorización ya concedida para el alcance actual no se pide de nuevo por microdecisiones reversibles.

No ejecutar resets, limpieza de fixtures, borrados, sobrescrituras ni suites mutantes contra producción. No usar `service_role`/claves privilegiadas en aplicación o mantenimiento para eludir RLS. Mantenimiento: dry-run primero, proyecto y propietario confirmados, `--apply` protegido por `IGUANA_VARIANTS_ALLOW_WRITE`, sin reemplazar originales/masters ni variantes válidas. Revisar la correspondencia de versiones de migración en `supabase/README.md` antes de cualquier sincronización CLI.

Nunca imprimir credenciales, cookies, JWT, contraseñas o claves privadas en chat, docs, logs, fixtures, screenshots o Git. `NEXT_PUBLIC_*` solo para configuración diseñada para navegador. `.env.local`, `.env.integration.local` y `.env.maintenance.local` están ignorados; únicamente plantillas vacías son versionables.

## QA y Git

- Home pública, mobile-first: **390 → 768 → 1440**. Área privada: debe funcionar bien desde 390 px hasta escritorio, sin una resolución principal. Ambas: imágenes verticales/horizontales, overflow, teclado/foco, cierre/navegación del visor y estados de carga/vacío/error. Emulación no demuestra instalación ni uso en un teléfono físico.
- Pruebas proporcionales: `npm test -- <archivos>`; `npm run test:isolated` para DAL/RLS aislados. Integración remota y E2E mutantes solo en un entorno aislado/disposable expresamente autorizado. Los mocks no prueban permisos reales.
- Algunas suites antiguas usan `assets/demo/`, eliminado intencionadamente. No recrearlo ni ejecutar ciegamente `test:supabase` o todos los E2E por sus flags históricos; revisar destino, fixtures y efectos antes.
- Cambios de código: tests afectados, `npm run typecheck`, `npm run lint`, build cuando afecte a producción/rutas/configuración y `git diff --check`. Cobertura objetivo/configurada: 80% de lógica comprobable; no inflarla con tests ficticios ni revalidar internamente Supabase sin dependencia propia.
- Repo GitHub **público**: revisar diff/staging, secretos, privacidad e ignorados antes de publicar; conservar identidad Git noreply local. Stage solo lo autorizado; no force push, amend, rebase ni reescritura de historial sin autorización específica. Tras un despliegue autorizado, comprobar Render Live y smoke real de solo lectura.

## Identidad y materiales

Preservar íntegro `assets/brand/`: no mover, borrar, sobrescribir, redibujar, reinterpretar ni recolorear la iguana o la tipografía oficial. Derivados técnicos autorizados van separados; favicon e iconos PWA usan el símbolo oficial. No reconstruir demos eliminadas ni sustituir fotografías reales por stock/IA. El diseño final de la home pública (portada con comparador, muro por trabajos y tipografía propia) está en [DESIGN.md](DESIGN.md); cambiar su estructura o estilo requiere autorización de diseño, y la identidad y los contratos funcionales se mantienen.
