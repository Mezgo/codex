# Informe Task 1: normalización y ranking determinista

## Resultado

Implementadas `normalizeSignal(signal, index)` y `normalizeSignals(payload)` en `src/domain/normalize-signal.mjs`, con normalización de campos, puntuaciones derivadas de presentación, etiqueta de estado, tendencia determinista, texto de búsqueda y validación del payload.

## Evidencia TDD

### RED

Comando:

```text
wsl.exe -d Ubuntu -- zsh -lic "cd /home/violet_tachyon/Platzi/Curso_Codex/proyecto/codex/.worktrees/codex/ai-radar-frontend && node --test tests/domain/normalize-signal.test.mjs"
```

Resultado: fallo esperado con `ERR_MODULE_NOT_FOUND` para `src/domain/normalize-signal.mjs`.

### GREEN

El mismo comando después de la implementación: 3 pruebas, 3 pasadas, 0 fallos.

Suite completa del proyecto:

```text
wsl.exe -d Ubuntu -- zsh -lic "cd /home/violet_tachyon/Platzi/Curso_Codex/proyecto/codex/.worktrees/codex/ai-radar-frontend && npm test"
```

Resultado: 12 pruebas, 12 pasadas, 0 fallos.

Suite combinada (incluye explícitamente el nuevo `.mjs`, ya que el script `npm test` actual solo incluye `tests/**/*.test.js`): 15 pruebas, 15 pasadas, 0 fallos.

## Archivos

- `src/domain/normalize-signal.mjs`: implementación de normalización y ranking determinista.
- `tests/domain/normalize-signal.test.mjs`: casos de campos completos, parciales y payload inválido.

## Auto-revisión

- Se respetó el contrato y la fórmula mínima especificada en el brief.
- Las puntuaciones son valores derivados para presentación; no se agregan hechos al backend.
- Los campos ausentes usan `Sin dato` o valores seguros y `searchText` se construye solo con datos presentes.
- La tendencia usa una semilla derivada del identificador para ser reproducible.
- Se dejaron intactos cambios no relacionados detectados en `tests/__pycache__`.

## Commit

`74b75d4 feat: normalizar señales para el dashboard`
