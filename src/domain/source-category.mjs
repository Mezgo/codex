const labels = new Map([
  ["official", "Oficial"],
  ["secondary-media", "Noticias"],
  ["community", "Comunidad"],
  ["technical-repo", "Repositorio técnico"],
  ["mixed", "Mixta"],
  ["blog", "Blog"]
]);

export function sourceCategory(type) {
  return labels.has(type) ? type : "unknown";
}

export function sourceCategoryLabel(category) {
  return labels.get(category) || "Sin categoría";
}
