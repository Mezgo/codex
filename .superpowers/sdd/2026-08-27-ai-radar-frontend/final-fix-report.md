# Corrección final de la rama AI Radar

Fecha: 2026-09-15
Base: `9820c59fe89ddeb5b4367056d6577d028bda7509`
Worktree: `/home/violet_tachyon/Platzi/Curso_Codex/proyecto/codex/.worktrees/codex/ai-radar-frontend`

## Resultado

Se resolvieron los siete hallazgos de la revisión final. La normalización ya no sustituye el estado operativo por una clasificación inferida, no fabrica scores cuando faltan dimensiones, calcula duplicados a nivel de colección y expone contexto real para dos modos de uso distintos. La UI conserva etiqueta de búsqueda visible, bordes con contraste no textual mínimo de 3:1, foco estable tras acciones dinámicas y cobertura E2E de orden, modos, exportación y paginación.

El gate final `npm run test:all` terminó con exit 0: 69 pruebas pasaron y quedó 1 skip intencional para no duplicar en móvil la captura contractual del error de escritorio.

## Hallazgo 1 — Fidelidad de estado y puntuaciones

### Decisiones

- `status` conserva el estado operativo y `statusLabel` lo presenta como `Activa`, `Investigando`, `Monitorear` u `Oportunidad abierta`; ya no depende del promedio.
- La validación primaria se conserva en `validationStatus`/`validationLabel` y la recomendación de hype en `hypeRecommendation`/`hypeRecommendationLabel`.
- Las dimensiones sin respaldo quedan en `null`; la UI presenta `Sin dato`.
- La puntuación compuesta solo se calcula cuando las cuatro dimensiones son finitas. Si falta una, queda en `null`.
- La tendencia queda en `null` cuando no existe puntuación compuesta, evitando una serie decorativa ficticia.
- El modelo incluye `evidence`, `impactSummary` y `action`, con fallback explícito `Sin dato`.
- Se eliminó `confidenceScores`, que no tenía consumidor.

### RED / GREEN

- RED: `node --test tests/domain/normalize-signal.test.mjs tests/domain/signal-collection.test.mjs` terminó con exit 1; 8 fallos reprodujeron `Señal fuerte` para `monitor`, pérdida de `investigating`, validación no expuesta, scores ficticios y orden incorrecto de faltantes.
- GREEN: el mismo comando terminó con 13 passed, 0 failed.
- Casos protegidos: `monitor` + `ignorar por ahora`, `investigating`, validación `warning`, campos incompletos y scores ausentes al final en ambos sentidos de orden.

## Hallazgo 2 — Duplicados reales

### Decisiones

- `normalizeSignal` sigue siendo individual y retorna `duplicateCount: 0` sin contexto global.
- `normalizeSignals` hace un segundo pase sobre la colección y cuenta otras señales que compartan título normalizado o URL canónica.
- Los títulos se normalizan con Unicode NFKD, eliminación de diacríticos, minúsculas, puntuación convertida a espacios y espacios colapsados.
- Las URLs HTTP(S) eliminan fragmento, parámetros de tracking conocidos y slash final no significativo; los parámetros restantes se ordenan.
- Una señal que coincide por título y URL con el mismo elemento cuenta ese elemento una sola vez y nunca se cuenta a sí misma.

### RED / GREEN

- RED: los casos de título y URL esperaban `[1, 1]` y recibieron `[0, 0]`.
- GREEN: título normalizado, URL canónica y ausencia de duplicados pasan dentro de las 13 pruebas afectadas.

## Hallazgo 3 — Modos funcionales

### Decisiones

- Modo lector muestra un bloque semántico prominente con evidencia, impacto y acción sugerida; las puntuaciones quedan visualmente secundarias.
- Modo operador oculta ese bloque extenso, mantiene una acción operativa compacta y prioriza puntuaciones y estado.
- La diferencia usa `data-mode` y `data-mode-content="reader|operator"`, no solo opacidad o padding.
- Filas y tarjetas comparten el contrato, por lo que el cambio también es observable a `390x844`.
- Estado, validación y recomendación de hype se presentan juntos en cada señal.
- El estado inicial usa `Todas las fechas`, de modo que la evidencia de éxito parte de 12 señales, una página visible de 7 y paginación real.

### RED / GREEN

- RED E2E: ambos proyectos no encontraban contenido por modo; el recorrido ampliado terminó con 7 failed, 12 passed y 1 skipped.
- GREEN E2E: lector/operador cambia contenido visible en desktop y mobile; la suite completa terminó con 19 passed y 1 skipped.
- RED visual adicional: el modo operador produjo overflow horizontal interno en escritorio.
- GREEN visual adicional: tabla de layout fijo y anchos de columna proporcionales; el test enfocado del modo operador pasó y la captura ya no recorta el estado.

## Hallazgo 4 — Accesibilidad visual

### Decisiones

- La etiqueta `Buscar señales` volvió al flujo visual normal y conserva su asociación con el input.
- Se agregó `--control-border: #607d99` y se aplica a input, select, botones secundarios, paginación y botones de modo.
- Controles con superficie azul usan `--on-blue` como borde contrastante.
- El foco visible existente de 3 px se conserva.

### RED / GREEN

- RED unitario: faltaba el token y el contrato de aplicación del borde; 1 fallo de 5.
- RED E2E: la etiqueta tenía un bounding box de 1 px de ancho en ambos viewports.
- GREEN unitario: 5 passed, incluida comprobación matemática de contraste >= 3:1 contra `--surface`, `--surface-strong` y `--blue`.
- GREEN E2E: etiqueta visible con ancho mayor de 40 px, alto mayor de 10 px y sin overflow en ambos viewports y modos.

## Hallazgo 5 — Cobertura E2E de aceptación

Se agregaron recorridos que verifican comportamiento real sin depender de copy de datos externos:

- orden compuesto ascendente y dimensión evidencia descendente mediante atributos numéricos renderizados;
- cambio lector/operador por contenido y jerarquía visibles;
- descarga real, parseo del JSON y equivalencia exacta de IDs con la página visible;
- contrato público de cada objeto exportado: `id`, `title`, `score`, `source`, `url`;
- navegación real a página 2, conjunto de IDs diferente y foco en el resumen;
- overflow del documento y del contenedor de resultados;
- estado inicial sin filtros de fecha y botón siguiente habilitado.

RED ajustado: una primera versión del test de orden convertía atributos ausentes a cero. Se endureció antes de producción para exigir valores finitos; el recorrido enfocado terminó con 6 fallos reales en desktop/mobile por filtro inicial, atributos ausentes y etiqueta de 1 px. GREEN: 19 passed, 1 skipped.

## Hallazgo 6 — Evidencia y gate

### Gate Python

Se utilizó una sentinela temporal no incluida en la entrega:

1. `npm run test:python` terminó con exit 1, 1 fallo de 8.
2. El `npm run test:all` anterior terminó con exit 0, demostrando que omitía Python.
3. Tras agregar `npm run test:python`, el mismo gate terminó con exit 1 exactamente en la sentinela.
4. Se eliminó la sentinela y el gate final ejecutó las 7 pruebas Python con `OK`.

El script final es:

`npm test && npm run test:python && npm run test:domain && npm run test:ui-unit && npm run test:ui`

### Capturas

`prepareSnapshot` se ejecuta inmediatamente antes de cada `page.screenshot`, elimina solo uno de los tres nombres permitidos y rechaza combinaciones no autorizadas. Las capturas de éxito se toman sin búsqueda ni filtros aplicados, en modo operador compacto y con la paginación dentro del viewport. Todas usan `fullPage: false`; la propia prueba lee el encabezado PNG y exige dimensiones exactas.

- `snapshots/ai-radar-desktop-success.png`: 1440x900, 518945 bytes.
- `snapshots/ai-radar-mobile-success.png`: 390x844, 133493 bytes.
- `snapshots/ai-radar-desktop-error.png`: 1440x900, 291516 bytes.

Las tres se inspeccionaron con detalle original después del gate final:

- escritorio de éxito: ranking denso, filas 3–7 visibles, estados completos, página 1 de 2 y botón siguiente sin recorte lateral;
- móvil de éxito: tarjetas compactas, estado/validación/hype, página 1 de 2 y controles completos sin overflow;
- escritorio de error: jerarquía clara, detalle 404 controlado, reintento visible y paginación deshabilitada.

### Foco dinámico

- `#result-summary` ya tenía `tabindex="-1"` y `aria-live="polite"`.
- Tras el botón dinámico `Limpiar filtros`, se renderiza el éxito y se enfoca esa región.
- Tras `Reintentar`, se espera el nuevo resultado y se enfoca la misma región aunque el error persista.
- Ambos recorridos están cubiertos por Playwright.

## Hallazgo 7 — Limpieza

- Se eliminó `confidenceScores`.
- No se agregaron secretos, dependencias, trazas ni `test-results`.
- Los dos `tests/__pycache__/*.pyc` preexistentes permanecen modificados en el worktree, pero se excluyen explícitamente del staging y del commit.

## Comandos y resultados finales

Todos los comandos Node/NPM se ejecutaron mediante Zsh login.

- `node --test tests/domain/normalize-signal.test.mjs tests/domain/signal-collection.test.mjs tests/ui/structure.test.mjs`: exit 0, 18 passed, 0 failed.
- `npm run test:ui`: exit 0, 19 passed, 1 skipped, 0 failed.
- `npm run test:all`: exit 0.
  - servidor/API Node: 15 passed;
  - Python: 7 passed;
  - dominio: 18 passed;
  - UI unitarias: 10 passed;
  - Playwright: 19 passed, 1 skipped;
  - total: 69 passed, 1 skipped, 0 failed.
- `git diff --check`: exit 0.

## Archivos modificados

- `package.json`
- `src/app.mjs`
- `src/domain/normalize-signal.mjs`
- `src/domain/sort-signals.mjs`
- `src/styles.css`
- `tests/domain/normalize-signal.test.mjs`
- `tests/domain/signal-collection.test.mjs`
- `tests/ui/ai-radar.spec.js`
- `tests/ui/structure.test.mjs`
- `snapshots/ai-radar-desktop-success.png`
- `snapshots/ai-radar-mobile-success.png`
- `snapshots/ai-radar-desktop-error.png`
- `.superpowers/sdd/2026-08-27-ai-radar-frontend/final-fix-report.md`

## Auto-revisión

- Cada comportamiento corregido tuvo una reproducción RED relevante antes del cambio y GREEN posterior.
- Las pruebas afirman resultados observables: modelo normalizado, orden real, DOM visible, descarga real, navegación real, foco y dimensiones de PNG.
- No se añadieron mocks del DOM ni aserciones sobre un mock.
- Las expectativas de duplicados y exportación se derivan con literales o desde la página visible, no reutilizan la lógica productiva.
- Los scores ausentes no se convierten en cero al ordenar y nunca desplazan datos reales.
- `normalizeSignal` no conoce la colección; el conteo global vive únicamente en `normalizeSignals`.
- El navegador sigue usando solo el fixture local declarado y la ruta de error cerrada `?fixture=missing`.
- La consola, errores de página, requests fallidos, respuestas inesperadas y orígenes externos permanecen como fallos de aceptación.
- El diff se limita al frontend, pruebas, capturas, package script e informe. Los `.pyc` preexistentes no forman parte de la entrega.
