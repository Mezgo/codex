# Contrato minimo de busquedas diarias

AI Radar guarda cada busqueda diaria como un documento JSON compatible con el esquema `schemas/ai-radar-daily-signals.schema.json`.

El contrato existe para conservar senales accionables en un formato estable antes de implementar comandos, base de datos o integraciones externas.

## Archivo diario

Los archivos diarios se guardan en:

```text
data/fixtures/daily-signals/YYYY-MM-DD.json
```

Ejemplo:

```text
data/fixtures/daily-signals/2026-07-31.json
```

## Campos raiz

Cada archivo debe incluir:

- `schemaVersion`: version del contrato. Actualmente `1.0.0`.
- `kind`: identificador del tipo de documento. Debe ser `ai-radar.daily-signals`.
- `generatedAt`: fecha y hora de generacion en formato ISO 8601.
- `query`: contexto de la busqueda diaria.
- `signals`: lista de senales normalizadas.

## Query

`query` describe como se genero la busqueda:

- `date`: fecha de la busqueda en formato `YYYY-MM-DD`.
- `prompt`: instruccion usada para generar o curar la busqueda.
- `language`: idioma principal del resultado, por ejemplo `es`.
- `topics`: temas usados para orientar la busqueda.

## Signal

Cada elemento de `signals` representa una senal accionable.

Campos obligatorios:

- `id`: identificador estable en `kebab-case`.
- `title`: titulo corto de la senal.
- `source`: fuente principal usada como evidencia.
- `evidence`: hecho verificable extraido de la fuente.
- `impact`: lectura de importancia para builders.
- `action`: siguiente accion recomendada.
- `status`: estado operativo de la senal.

Campos opcionales:

- `tags`: etiquetas para filtrar o agrupar senales.
- `sourceProfile`: procedencia principal de la senal y agente de razonamiento que la encontro.
- `corroboratingSources`: fuentes adicionales que corroboran, contextualizan o discuten la senal.
- `primarySourceValidation`: auditoria local o curada de fuente primaria.
- `sourceComparison`: resultado resumido del agente `comparar-fuentes`.
- `hypothesis`: hipotesis falsable generada por `formular-hipotesis-senales`.
- `hypeAssessment`: evaluacion de hype generada por `detectar-hype`.

## Source

`source` debe incluir:

- `name`: nombre de la fuente.
- `url`: enlace directo a la noticia o pagina usada.
- `publishedAt`: fecha de publicacion en formato `YYYY-MM-DD`.

## Impact

`impact` separa el nivel de importancia de la explicacion:

- `level`: uno de `low`, `medium`, `medium-high`, `high` o `critical`.
- `summary`: razon concreta por la que importa.

## Status

Estados permitidos:

- `active`: la senal ya esta ocurriendo y requiere atencion.
- `monitor`: conviene seguirla, pero aun falta evidencia o adopcion.
- `investigating`: hay un incidente o hecho abierto que sigue bajo revision.
- `open-opportunity`: hay una oportunidad concreta para explorar.
- `pending-litigation`: depende de un proceso legal pendiente.

## Enriquecimiento por agentes

Cuando una busqueda usa agentes especializados, cada senal puede guardar bloques
adicionales sin cambiar los campos minimos:

- `sourceProfile.type`: `official`, `technical-repo`, `community`, `secondary-media` o `mixed`.
- `sourceProfile.reasoningAgent`: nombre del agente o rol que encontro la senal.
- `primarySourceValidation.status`: `passed`, `warning` o `failed`.
- `sourceComparison`: sintetiza acuerdos, discrepancias, veredicto trazable y evidencia faltante.
- `hypothesis`: convierte la novedad en una hipotesis comprobable con experimento minimo.
- `hypeAssessment`: puntua la distancia entre claims y evidencia en una escala de 0 a 10.

Estos campos son interpretaciones de AI Radar. La fuente sigue estando en `source`
y los hechos verificables deben seguir en `evidence`.

## Ejemplo minimo

```json
{
  "schemaVersion": "1.0.0",
  "kind": "ai-radar.daily-signals",
  "generatedAt": "2026-07-31T00:00:00-05:00",
  "query": {
    "date": "2026-07-31",
    "prompt": "Buscar noticias recientes de inteligencia artificial",
    "language": "es",
    "topics": ["artificial intelligence", "AI safety"]
  },
  "signals": [
    {
      "id": "example-ai-signal",
      "title": "Titulo corto de la senal",
      "source": {
        "name": "Fuente",
        "url": "https://example.com/news",
        "publishedAt": "2026-07-31"
      },
      "evidence": "Hecho verificable tomado de la fuente.",
      "impact": {
        "level": "high",
        "summary": "Por que importa para builders."
      },
      "action": "Siguiente accion recomendada.",
      "status": "active",
      "tags": ["example"]
    }
  ]
}
```

## Regla practica

La evidencia debe describir lo que la fuente afirma. El impacto y la accion pueden ser criterio de AI Radar, pero no deben presentarse como hechos de la fuente si son inferencias.
