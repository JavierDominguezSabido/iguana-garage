# Iguana Garage — instrucciones operativas

## Alcance y Gate 1

Proyecto nuevo: no reutilizar código/configuración del antiguo proyecto Robin. Leer `PRODUCT.md` y `DESIGN.md`; distinguir requisitos, propuestas y decisiones pendientes.

**Gate 1 permite solo preparación y documentación.** Esperar aprobación explícita del plan antes de implementar. En esta fase: no instalar Next.js/dependencias, conectar Supabase, construir componentes/pantallas, hacer staging/commits ni configurar remotos. ECC no anula estos límites.

## Workflow Codex/ECC

1. Inspeccionar el workspace e instrucciones aplicables; elegir y leer las skills pertinentes antes de actuar.
2. Concretar alcance, aceptación, arquitectura mínima y riesgos; no inventar reglas de negocio.
3. Tras aprobar el plan, implementar incrementos mediante TDD, revisar y verificar.
4. Informar cambios, evidencias reales, limitaciones y decisiones abiertas.

Usar `ecc-guide` para localizar capacidades, `intent-driven-development` para aceptación, `frontend-design-direction` para dirección visual y `tdd-workflow`/`verification-loop` durante desarrollo. Comprobar disponibilidad; no instalar skills, duplicar configuración ni activar agentes/herramientas sin necesidad y autorización aplicable. No asumir comandos de Claude en Codex.

## TDD, review y verification

- RED observado por el comportamiento previsto → implementación mínima → misma prueba GREEN → refactor con pruebas verdes. Conservar comandos/resultados; no ejecutar checkpoints Git contra instrucciones del usuario.
- Unitarias para validación, integración real de Auth/RLS/Storage y E2E de recorridos críticos. Los mocks no prueban autorización real.
- Objetivo ECC: 80% de cobertura del código comprobable; probar explícitamente denegaciones, errores y recuperación independientemente del porcentaje.
- Revisar alcance, seguridad, límites servidor/cliente, accesibilidad, móvil y estados de carga/vacío/error.
- Cuando exista aplicación: build, tipos strict, lint, pruebas/cobertura y revisión de cambios/secretos con scripts reales. Declarar lo no ejecutado; nunca inventar PASS.
- En este gate documental: coherencia, rutas, `git status` e integridad de materiales. No crear pruebas artificiales de aplicación.

## Arquitectura y seguridad

- Stack previsto: Next.js, React, TypeScript strict, Tailwind CSS y Supabase Auth/PostgreSQL/Storage. Justificar dependencias adicionales; respetar rutas/modelo de `PRODUCT.md` y evitar capas innecesarias.
- Proteger todo `/app` con sesión validada en servidor y autorizar cada lectura/mutación/operación de medios. Ocultar enlaces o comprobar solo un layout no basta.
- RLS por propietario y políticas de Storage para originales privados. Probar anónimo, sesión caducada y usuario ajeno mediante acceso directo.
- No hardcodear credenciales ni comprobar contraseñas en React. No incluir secretos en documentación, fixtures, logs o `NEXT_PUBLIC_*`; exponer solo configuración diseñada para navegador.
- Gestionar con identidad del usuario y RLS; nunca usar claves privilegiadas en cliente o para eludir políticas.
- Portfolio limitado a publicación autorizada: no abrir lecturas anónimas generales ni copiar automáticamente demo/referencias a `public/`.
- Validar entradas/archivos y coordinar subidas/borrados con metadatos y recuperación. No comunicar éxito incompleto.

## Diseño y materiales

Diseñar primero teléfono y adaptar específicamente escritorio. Las referencias orientan el lenguaje visual; `PRODUCT.md` delimita funciones.

**No modificar, renombrar, mover, borrar ni sobrescribir `assets/` o `references/`.** Mantenerlos versionables. Derivados futuros irán separados, dentro de alcance autorizado. Usar solo identidad oficial de `assets/brand/`: no redibujar, reinterpretar, recolorear ni regenerar el lagarto. Verificar con fotos reales de `assets/demo/`; no sustituirlas por stock premium ni extraer assets de los mockups.
