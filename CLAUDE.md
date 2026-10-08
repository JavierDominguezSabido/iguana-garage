# Iguana Garage — instrucciones para Claude Code

Web de un taller de chapa y pintura: portfolio público en `/` y gestión privada en `/app` para un único propietario. En producción con datos reales.

Estos tres documentos son la fuente de verdad y se cargan siempre:

- Operación, seguridad, autorizaciones y QA: @AGENTS.md
- Funciones, rutas, datos y arquitectura: @PRODUCT.md
- Identidad visual y dirección de diseño: @DESIGN.md

Si el código contradice un documento, manda el código: avisa de la discrepancia y actualiza el documento en el mismo cambio.

## Reglas rápidas

- Trabaja en una rama propia creada desde `main` actualizado. Un push a `main` despliega solo en Render: nunca commit, push ni merge sin autorización explícita.
- No toques producción: nada de suites mutantes, borrados, migraciones ni variables remotas sin permiso.
- Nunca muestres credenciales, cookies ni claves en chat, logs, capturas o Git.
- `README.md` resume el proyecto y los comandos; `docs/` son informes históricos de fases ya cerradas, no tareas pendientes ni estado actual.
- Antes de dar algo por terminado: tests afectados, `npm run typecheck`, `npm run lint`, `npm run build` si afecta a producción, y `git diff --check`. No declares como superado un check que no hayas ejecutado.
