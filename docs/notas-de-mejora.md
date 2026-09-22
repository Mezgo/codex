# Notas de mejora futura

Este archivo reúne observaciones, ideas y cambios potenciales para AI Radar.

> Las notas de este documento **no autorizan ni activan cambios** en el producto. Se implementarán únicamente cuando se solicite de forma explícita.

## Cómo añadir una nota

Incluye una descripción breve, el área afectada y, si ayuda, el resultado esperado.

## Observaciones pendientes

- **Filtro directo por fuente**
  - Área: búsqueda y filtros del ranking.
  - Idea: permitir que la persona usuaria filtre las señales seleccionando o escribiendo el nombre de una fuente concreta.

## Mejoras aplicadas

- **Filtro por categoría de fuente — 2026-09-22**
  - El selector agrupa por `sourceProfile.type`: Oficial, Noticias, Comunidad, Repositorio técnico y Mixta. Solo muestra categorías presentes en los datos cargados.
  - Los valores ausentes o desconocidos aparecen como «Sin categoría». La interfaz reconoce Blog si un futuro dato lo declara; el contrato actual de fixtures aún no incluye ese tipo.
  - Se combina con texto y fecha, reinicia la paginación al cambiar y se restablece con «Limpiar filtros».
