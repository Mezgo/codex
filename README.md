# AI Radar

AI Radar es el proyecto del curso avanzado de Codex.

El objetivo del producto es organizar noticias, herramientas, papers, repos y lanzamientos de IA para convertirlos en senales accionables para builders: que paso, por que importa, que tan confiable es y que vale la pena probar.

Estado inicial: definicion de producto, stack objetivo y reglas iniciales. La implementacion se construye por capas durante el curso con Codex.

## Problema

El ritmo de la inteligencia artificial genera demasiado ruido:

- lanzamientos repetidos en varias fuentes,
- repos que parecen importantes pero no tienen adopcion,
- demos sin documentacion suficiente,
- papers sin ejemplo practico,
- herramientas con impacto real mezcladas con marketing.

AI Radar debe ayudar a separar ruido de senales utiles.

## Producto Objetivo

Al final del curso, AI Radar debe poder:

- recopilar novedades de IA desde fuentes seleccionadas,
- normalizar noticias, repos, papers y productos,
- detectar duplicados y noticias parecidas,
- agrupar senales por tema,
- rankear por novedad, impacto, evidencia y accionabilidad,
- generar guias practicas para decidir que probar,
- exponer resultados en un dashboard,
- guardar trazas de decisiones y validaciones,
- desplegarse con infraestructura controlada.

## Estado Inicial

El starter contiene:

- `README.md`
- `.gitignore`

La primera clase usa este estado para mostrar como `AGENTS.md` cambia la forma en que Codex entiende un proyecto antes de escribir codigo.

## Estado Actual

El repo ya conserva senales diarias como fixtures JSON y agrega una ruta server-side para persistirlas en Supabase cuando el proyecto y las variables de entorno esten configurados.

- Contrato local: `schemas/ai-radar-daily-signals.schema.json`.
- Fixtures: `data/fixtures/daily-signals/YYYY-MM-DD.json`.
- API server-side: `api/daily-signals.js`.
- Migracion Supabase: `supabase/migrations/0001_initial_ai_radar.sql`.
- Guia de setup: `docs/supabase-persistence.md`.

## Stack Objetivo

El stack debe mantenerse simple para que el foco del curso sea Codex, no el framework.

- Frontend: HTML, CSS y JavaScript.
- Dominio: modulos JavaScript reutilizables.
- CLI: `airadar` para comandos internos del proyecto.
- Automatizacion local: scripts Node.js.
- Proyecto agent-friendly: Dekk cuando existan comandos que deban usar humanos y agentes.
- API: Vercel Functions cuando hagan falta endpoints.
- Datos locales: fixtures y snapshots antes de conectar servicios externos.
- Base de datos: Supabase cuando el contrato local ya funcione.
- QA: `node:test` para dominio y Playwright cuando exista interfaz visual.
- Demo final: video programatico con la evidencia del proyecto.

## Reglas Iniciales Para Codex

Antes de implementar, Codex debe distinguir:

- vision del producto,
- estado actual del repositorio,
- decisiones tecnicas tomadas,
- decisiones pendientes,
- limites de seguridad.

Codex no debe inventar archivos, comandos, servicios ni integraciones como si ya existieran.
