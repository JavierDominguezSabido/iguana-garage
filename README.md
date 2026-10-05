# Iguana Garage

Gate 2: foundation técnica. `/` está vacío deliberadamente; únicamente existen el layout raíz y el icono técnico. No hay autenticación, Supabase ni interfaces de producto.

Las instrucciones y el alcance están en `AGENTS.md`, `PRODUCT.md` y `DESIGN.md`. Esos archivos y todos los materiales originales se conservan íntegros.

## Entorno y versiones instaladas

Entorno verificado: Node.js **24.18.0**, npm **11.16.0**. El proyecto declara Node 24 y npm 11. Dependencias exactas en `package.json`; resolución reproducible mediante `package-lock.json`.

| Dependencia | Versión |
| --- | --- |
| Next.js / eslint-config-next | 16.3.8 |
| React / React DOM | 19.3.0 |
| TypeScript | 6.0.3 |
| Tailwind CSS / @tailwindcss/postcss | 4.3.3 |
| PostCSS | 8.5.29 |
| ESLint | 9.39.5 |
| Vitest | 5.0.3 |
| @playwright/test | 1.63.0 |
| @types/node | 24.19.1 |
| @types/react / @types/react-dom | 19.3.0 |

Versiones consultadas en npm durante la inicialización. TypeScript 6.0.3 está dentro del rango admitido por el parser instalado (`>=4.8.4 <6.1.0`). ESLint permanece en 9.39.5 por los bloqueos documentados a continuación.

## Deuda técnica temporal: actualización a ESLint 10

Auditoría del 6 de octubre de 2026. Candidata estable actual consultada en npm: **ESLint 10.12.0**. Se inspeccionaron los manifiestos de **389 paquetes instalados**, incluidos los anidados, y se contrastaron con `package-lock.json`: sin discrepancias de versión. De los 13 paquetes con peer de ESLint, tres rechazan la candidata:

| Paquete instalado | Peer completo de ESLint |
| --- | --- |
| `eslint-plugin-react@7.37.5` | `^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7` |
| `eslint-plugin-import@2.32.0` | `^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9` |
| `eslint-plugin-jsx-a11y@6.10.2` | `^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9` |

Son dependencias efectivamente cargadas por `eslint-config-next@16.3.8`: nuestro preset `core-web-vitals` incluye su configuración base, que registra esos plugins. Las versiones estables actuales de los tres paquetes en npm coinciden con las instaladas y mantienen estos peers.

`eslint-config-next@16.3.8` declara `eslint >=9.0.0`, pero ese rango no basta para validar sus transitivas. `typescript-eslint`, su parser/plugin y utilidades instalados en 8.71.1 admiten ESLint 10 y TypeScript 6.0.3; React Hooks 7.1.1 también admite ESLint 10. Next.js 16.3.8 no declara un peer de ESLint y Node 24.18.0 cumple el motor de la candidata.

**Decisión:** conservar temporalmente **ESLint 9.39.5**, con `package.json`, lockfile y configuración intactos. No instalar la candidata, forzar peers ni retirar reglas para esquivar el bloqueo. La advertencia de fin de soporte de ESLint 9 queda registrada como deuda técnica temporal, no como una actualización resuelta.

**Criterio de cierre:** una combinación de versiones de la configuración de Next y los tres plugins que declare soporte de ESLint 10, seguida de verificación de configuración/reglas y de todos los checks del proyecto. No se ha ejecutado ESLint 10: la incompatibilidad declarada de peers ya impide la actualización autorizada. La [guía oficial de migración](https://eslint.org/docs/latest/use/migrate-to-10.0.0) describe además los cambios de API que deberán comprobarse al desbloquearla.

## Comandos

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:e2e:config
npm run build
npm run start
```

`typecheck` genera primero los tipos de Next para no depender de un build anterior. `.env.example` explica la configuración de entorno; no hay variables requeridas ni credenciales. Los valores futuros irán en `.env.local`, excluido por el `.gitignore` existente.

Vitest usa Node, el alias `@/` y una única prueba del layout: documento en español y conservación de `children`. Se observó RED con layout incompleto y GREEN al implementarlo. No hay cobertura ficticia ni lógica de negocio añadida para probarla.

Playwright está preparado para Chromium desktop y móvil Pixel 7, contra el servidor de producción en `127.0.0.1:3100`. `test:e2e:config` valida la configuración con cero escenarios; no equivale a una suite E2E aprobada. Cuando existan recorridos autorizados, crear sus pruebas en `e2e/`, instalar Chromium con `npx playwright install chromium` y ejecutar `npm run build` seguido de `npm run test:e2e`.

En Gate 2 se ejecutó además un smoke técnico de Playwright con Chrome local 154.0.8037.97, en desktop y móvil: HTTP 200, título/idioma del documento, ausencia de errores JavaScript e icono idéntico al original.

## Decisiones de foundation

- Inicialización manual siguiendo [Next.js](https://nextjs.org/docs/app/getting-started/installation), para preservar archivos existentes y evitar scaffolding de pantallas/configuración de agentes.
- Solo `src/app/` tiene una función actual. Componentes, features y lib se crearán cuando exista comportamiento real que alojar.
- Tailwind mediante PostCSS, sin tema de marca, fuentes remotas ni librerías visuales.
- `src/app/icon.png` es una copia byte a byte del símbolo oficial; no hay retoque ni modificación del original.
- ECC: guía, flujo equivalente Research → Plan → TDD → Implement → Review → Verify, `tdd-workflow` y `verification-loop`. `orch-build-mvp` se evaluó y no se aplica completo porque excede la foundation.
- Onboarding: las mappings actuales detectan Next.js/React/TypeScript. `project-init` se evaluó mediante `install-apply.js --target codex --dry-run --json --skills coding-standards,tdd-workflow,verification-loop`; el plan apunta a configuración global de Codex. No se aplicó ni se duplicó ECC en el proyecto.

Los checks de Gate 2 verifican infraestructura; Auth, RLS, Storage y recorridos de usuario se comprobarán en sus fases autorizadas. No hay staging, commits, remote ni push.
