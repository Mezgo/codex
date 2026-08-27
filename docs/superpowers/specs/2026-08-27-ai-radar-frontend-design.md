# Diseño del frontend de AI Radar

Fecha: 2026-08-27

## Objetivo

Construir el primer frontend navegable de AI Radar a partir de la referencia visual proporcionada. La interfaz permitirá explorar y comparar señales guardadas en los fixtures existentes sin presentar datos simulados como una integración activa.

El resultado debe usar únicamente HTML, CSS y JavaScript planos, mantener la estética oscura de la referencia y cumplir el contrato global `desarrollo-web-calidad`: procedencia de datos explícita, estados completos, responsive, accesibilidad, consola limpia y capturas finales.

## Alcance

La primera versión incluirá:

- encabezado de producto y navegación principal;
- búsqueda por título, fuente, etiquetas y contenido relevante;
- selector entre modo lector y modo operador;
- filtros por fecha y fuente;
- orden por puntuación compuesta y dimensiones disponibles;
- listado de señales con puntuaciones, tendencia, estado y etiquetas;
- aviso visible de procedencia de datos;
- exportación del subconjunto visible a JSON;
- paginación local;
- estados de carga, éxito, vacío y error;
- presentación responsive para móvil y escritorio.

No incluye autenticación, escritura en Supabase, edición de señales, sincronización automática ni exposición del token privado de la API.

## Fuente de datos

El frontend cargará el fixture local más reciente disponible en `data/fixtures/daily-signals/`. La fecha concreta usada inicialmente será `2026-08-04`, porque ese archivo ya existe y cumple el contrato del repositorio.

La interfaz mostrará que los datos proceden de un fixture local. No afirmará que está conectada a Supabase ni a una API en vivo.

El acceso a datos quedará detrás de un adaptador pequeño. Este devolverá un resultado normalizado para que una futura integración server-side pueda reemplazar el fixture sin reescribir la vista. El navegador nunca recibirá `AI_RADAR_API_TOKEN`.

## Arquitectura

### Archivos de interfaz

- `src/index.html`: estructura semántica, controles nativos y regiones de estado.
- `src/styles.css`: sistema visual, layout responsive, foco visible y preferencias de movimiento.
- `src/app.js`: arranque, estado de la aplicación, eventos y renderizado.
- `src/data/load-signals.js`: carga declarada del fixture y traducción de errores.

### Módulos de dominio

- `src/domain/normalize-signal.js`: transforma el contrato de señal actual al modelo de presentación.
- `src/domain/filter-signals.js`: búsqueda y filtros deterministas.
- `src/domain/rank-signal.js`: calcula las cuatro dimensiones y la puntuación compuesta a partir de campos existentes.
- `src/domain/sort-signals.js`: orden estable ascendente o descendente.
- `src/domain/paginate-signals.js`: divide resultados sin acoplarse al DOM.

Las puntuaciones derivadas serán reglas de presentación reproducibles, no datos atribuidos al backend. Sus criterios quedarán expresados en código y pruebas.

### Desarrollo local

Se agregará un servidor estático mínimo basado en Node y un comando `npm run dev`. El servidor expondrá el repositorio local para que `src/index.html` pueda cargar el fixture mediante `fetch` sin depender de extensiones ni abrir archivos con `file://`.

## Modelo de presentación

Cada señal mostrará:

- título;
- tipo derivado de `sourceProfile.type`;
- fuente y fecha;
- etiquetas;
- puntuación compuesta;
- novedad, impacto, evidencia y accionabilidad;
- tendencia decorativa determinista basada en la puntuación;
- estado derivado de `status`, validación primaria y evaluación de hype;
- indicador de duplicados cuando existan coincidencias normalizadas por título o URL.

Cuando un campo no exista, la interfaz usará un texto explícito como “Sin dato”; no inventará valores factuales.

## Interacción y estados

El estado central contendrá consulta, filtros, orden, modo, página y resultado de carga. Cada cambio recalculará la lista mediante funciones puras.

- **Carga:** esqueleto o mensaje con `aria-busy` mientras se obtiene el fixture.
- **Éxito:** listado, conteo y paginación actualizados.
- **Vacío:** explicación y acción para limpiar filtros.
- **Error:** mensaje accesible, detalle seguro y botón para reintentar.
- **Datos parciales:** campos ausentes se marcan como “Sin dato” sin romper el listado.

El modo lector priorizará contexto y texto. El modo operador mostrará más densidad de puntuaciones y acciones. Ambos usarán los mismos datos y filtros.

## Responsive

En escritorio, la vista seguirá la referencia con filtros horizontales y tabla de alta densidad. En móvil, cada señal será una tarjeta apilada; los controles ocuparán filas completas y la navegación secundaria podrá compactarse sin ocultar acciones esenciales.

Viewports mínimos de verificación:

- móvil: `390x844`;
- escritorio: `1440x900`.

También se comprobará un ancho intermedio si aparece un cambio material de layout durante la implementación.

## Accesibilidad

- HTML semántico con encabezados jerárquicos, `header`, `main`, formularios y tabla o lista apropiada.
- Etiquetas visibles para búsqueda, filtros y orden.
- Botones y enlaces nativos con nombres accesibles.
- Navegación completa por teclado y foco claramente visible.
- Estado de carga y mensajes dinámicos anunciados con regiones vivas moderadas.
- Puntuaciones y estados comunicados mediante texto, no solo color.
- Contraste suficiente en texto, bordes y controles.
- Respeto por `prefers-reduced-motion`.
- Objetivos táctiles de al menos 44 píxeles cuando el layout sea móvil.

## Estilo visual

Se conservarán los rasgos principales de la referencia:

- fondo azul casi negro con profundidad sutil;
- acento azul eléctrico para navegación y selección;
- verde, ámbar y gris para calidad de señal, siempre acompañados por texto;
- bordes finos, tarjetas contenidas y tipografía sans-serif del sistema;
- densidad informativa alta en escritorio y jerarquía clara en móvil.

Los iconos serán SVG inline o símbolos propios sin añadir una dependencia externa.

## Pruebas y evidencia

### Dominio

Se usarán pruebas `node:test` para normalización, ranking, búsqueda, orden y paginación. Los casos cubrirán campos ausentes, resultados vacíos y estabilidad del orden.

### Navegador

Se agregará Playwright únicamente porque ya existirá una interfaz visual. Las pruebas comprobarán:

- carga correcta del fixture declarado;
- búsqueda y filtros;
- estado vacío y recuperación;
- estado de error mediante una ruta de fixture inválida controlada;
- navegación por teclado y foco visible en controles principales;
- ausencia de errores y advertencias relevantes en consola;
- ausencia de desbordamiento horizontal en móvil y escritorio.

### Capturas

Después de la última modificación se generarán capturas finales en `snapshots/`:

- `ai-radar-desktop-success.png` a `1440x900`;
- `ai-radar-mobile-success.png` a `390x844`;
- una captura adicional del estado de error o vacío si aporta evidencia no visible en las dos anteriores.

Las capturas usarán exclusivamente el fixture declarado y se identificarán como demo local.

## Criterios de aceptación

La entrega podrá denominarse “lista como demo” cuando:

1. cargue el fixture declarado sin exponer secretos;
2. búsqueda, filtros, orden, modos, exportación y paginación funcionen;
3. carga, éxito, vacío, error y datos parciales estén implementados;
4. los viewports móvil y escritorio no presenten desbordamiento ni controles inaccesibles;
5. el recorrido principal funcione por teclado con foco visible;
6. las pruebas existentes y nuevas pasen;
7. consola y red no presenten fallos inesperados;
8. existan capturas finales móvil y escritorio;
9. la interfaz indique que utiliza fixtures locales.

No se declarará integración end-to-end hasta que exista una ruta server-side apta para el navegador y se valide contra Supabase.
