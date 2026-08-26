# Guía del Repositorio

## Estructura del Proyecto y Organización de Módulos

AI Radar es un repositorio inicial para el curso avanzado de Codex. La estructura implementada es mínima:

- `README.md`: visión del producto, stack objetivo y reglas iniciales para Codex.
- `.gitignore`: secretos, datos generados, grabaciones y futuros artefactos de build.

Cuando empiece la implementación, mantén una estructura simple:

- `src/`: HTML, CSS y JavaScript para la interfaz del navegador.
- `src/domain/`: módulos reutilizables para ranking, deduplicación, normalización y agrupación.
- `tests/`: pruebas con `node:test` para la lógica de dominio.
- `fixtures/` o `data/fixtures/`: entradas locales antes de conectar servicios externos.
- `snapshots/`: salidas generadas; evita commitear snapshots grandes salvo que sea necesario.

## Comandos de Build, Pruebas y Desarrollo

Todavía no existen comandos de build o pruebas. No inventes comandos hasta que se agreguen los archivos correspondientes.

Los comandos futuros esperados deben mantenerse basados en Node, por ejemplo:

- `npm test`: ejecuta pruebas de dominio con `node:test`.
- `npm run dev`: sirve el frontend local cuando exista.
- `node scripts/<tarea>.js`: ejecuta scripts locales de automatización.
- `airadar <comando>`: comandos del CLI del proyecto cuando esté implementado.

## Estilo de Código y Convenciones de Nombres

Usa JavaScript, HTML y CSS planos salvo que el repo adopte otra herramienta. Prefiere módulos pequeños. Usa:

- Indentación de 2 espacios.
- `camelCase` para funciones y variables.
- `PascalCase` solo para clases o constructores.
- `kebab-case` para scripts CLI o assets estáticos.
- Nombres descriptivos de dominio como `normalizeItem`, `rankSignal` o `dedupeSources`.

## Guía de Pruebas

Usa `node:test` para módulos de dominio. Incluye casos con fixtures para duplicados, ranking, confiabilidad de fuentes y accionabilidad. Nombra las pruebas según el comportamiento, por ejemplo `rank-signal.test.js`.

Agrega Playwright solo cuando exista una interfaz visual.

## Guía de Commits y Pull Requests

El historial usa prefijos estilo Conventional Commits, por ejemplo `docs:` y `chore:`. Continúa ese patrón:

- `docs: actualizar reglas del producto`
- `feat: agregar modulo de ranking de señales`
- `test: cubrir detección de duplicados`
- `chore: actualizar salidas ignoradas`

Los pull requests deben incluir resumen, contexto o issue relacionado, resultados de pruebas y capturas solo si hay cambios de UI.

## Instrucciones Específicas para Agentes

Antes de cambiar código, distingue la visión del producto del estado actual. No afirmes que existen archivos, comandos, APIs, bases de datos o integraciones hasta que estén presentes.
