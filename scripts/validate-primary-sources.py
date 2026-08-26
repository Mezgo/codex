#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse


IMPACT_WEIGHT = {
  "low": 1,
  "medium": 2,
  "medium-high": 3,
  "high": 4,
  "critical": 5,
}

PRIMARY_DOMAIN_KEYWORDS = {
  "anthropic": ["anthropic.com"],
  "google": ["google.com", "google.dev", "ai.google.dev", "blog.google", "deepmind.google"],
  "meta": ["meta.com", "ai.meta.com"],
  "microsoft": ["microsoft.com", "azure.microsoft.com", "blogs.microsoft.com"],
  "nvidia": ["nvidia.com", "investor.nvidia.com"],
  "openai": ["openai.com", "platform.openai.com"],
  "vercel": ["vercel.com"],
}

SECONDARY_SOURCE_DOMAINS = {
  "apnews.com",
  "axios.com",
  "businessinsider.com",
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "www.apnews.com",
  "www.axios.com",
  "www.businessinsider.com",
  "www.techcrunch.com",
  "www.theverge.com",
  "www.wired.com",
  "ft.com",
  "www.ft.com",
}


def parse_args():
  parser = argparse.ArgumentParser(
    description="Valida si las senales diarias de AI Radar usan fuentes primarias."
  )
  parser.add_argument("--day", required=True, help="Dia a consultar en formato YYYY-MM-DD.")
  parser.add_argument("--limit", "-n", type=positive_int, default=5, help="Cantidad de senales a validar.")
  parser.add_argument(
    "--order",
    default="impact-desc",
    choices=["impact-desc", "impact-asc", "published-desc", "published-asc", "input"],
    help="Orden de las senales antes de validar.",
  )
  parser.add_argument(
    "--data-dir",
    default="data/fixtures/daily-signals",
    help="Directorio con archivos diarios YYYY-MM-DD.json.",
  )
  return parser.parse_args()


def positive_int(value):
  try:
    parsed = int(value)
  except ValueError:
    raise argparse.ArgumentTypeError("--limit debe ser un entero positivo.") from None
  if parsed < 1:
    raise argparse.ArgumentTypeError("--limit debe ser mayor o igual a 1.")
  return parsed


def load_daily_signals(data_dir, day):
  path = Path(data_dir) / f"{day}.json"
  if not path.exists():
    raise FileNotFoundError(f"No existe el JSON diario: {path}")

  with path.open(encoding="utf-8") as file:
    payload = json.load(file)

  if payload.get("kind") != "ai-radar.daily-signals":
    raise ValueError(f"El archivo no es un JSON diario de AI Radar: {path}")
  if payload.get("query", {}).get("date") != day:
    raise ValueError(f"La fecha interna del JSON no coincide con --day: {path}")
  if not isinstance(payload.get("signals"), list):
    raise ValueError(f"El archivo no contiene una lista valida de senales: {path}")

  return payload


def sort_signals(signals, order):
  indexed = list(enumerate(signals))
  if order == "input":
    return signals
  if order == "impact-desc":
    return [
      signal
      for _, signal in sorted(
        indexed,
        key=lambda item: (-impact_weight(item[1]), item[0]),
      )
    ]
  if order == "impact-asc":
    return [
      signal
      for _, signal in sorted(
        indexed,
        key=lambda item: (impact_weight(item[1]), item[0]),
      )
    ]
  if order == "published-desc":
    return [
      signal
      for _, signal in sorted(
        indexed,
        key=lambda item: (published_at(item[1]), -item[0]),
        reverse=True,
      )
    ]
  if order == "published-asc":
    return [
      signal
      for _, signal in sorted(
        indexed,
        key=lambda item: (published_at(item[1]), item[0]),
      )
    ]
  raise ValueError(f"Orden no soportado: {order}")


def impact_weight(signal):
  return IMPACT_WEIGHT.get(signal.get("impact", {}).get("level"), 0)


def published_at(signal):
  return signal.get("source", {}).get("publishedAt", "")


def validate_signal(signal):
  source = signal.get("source", {})
  source_name = source.get("name", "")
  source_url = source.get("url", "")
  parsed_url = urlparse(source_url)
  domain = normalize_domain(parsed_url.netloc)

  if parsed_url.scheme not in {"http", "https"} or not domain:
    return validation_result(
      signal,
      status="failed",
      source_type="invalid",
      domain=domain,
      reason="La fuente no tiene una URL http(s) valida.",
    )

  entity = infer_entity(signal)
  if entity and domain_matches_any(domain, PRIMARY_DOMAIN_KEYWORDS.get(entity, [])):
    return validation_result(
      signal,
      status="passed",
      source_type="primary",
      domain=domain,
      reason=f"El dominio coincide con la entidad principal inferida: {entity}.",
    )

  source_label = normalize_token(source_name)
  if is_primary_project_source(signal, domain, source_label):
    return validation_result(
      signal,
      status="passed",
      source_type="primary",
      domain=domain,
      reason="La fuente parece ser un repositorio, release, model card o dominio oficial del artefacto.",
    )

  if is_primary_public_source(source_name, domain):
    return validation_result(
      signal,
      status="passed",
      source_type="primary",
      domain=domain,
      reason="La fuente parece ser un organismo publico o regulador oficial.",
    )

  if domain in SECONDARY_SOURCE_DOMAINS:
    return validation_result(
      signal,
      status="warning",
      source_type="secondary",
      domain=domain,
      reason="La fuente parece un medio o reporte secundario; conviene buscar anuncio, filing, paper o repositorio original.",
    )

  if source_label and source_label in normalize_token(domain):
    return validation_result(
      signal,
      status="warning",
      source_type="unknown",
      domain=domain,
      reason="El dominio coincide con el nombre de la fuente, pero no hay evidencia local suficiente para marcarla como primaria.",
    )

  return validation_result(
    signal,
    status="warning",
    source_type="unknown",
    domain=domain,
    reason="No se pudo confirmar localmente si la fuente es primaria.",
  )


def normalize_domain(domain):
  domain = domain.lower().strip()
  if domain.startswith("www."):
    return domain[4:]
  return domain


def domain_matches_any(domain, candidates):
  return any(domain == candidate or domain.endswith(f".{candidate}") for candidate in candidates)


def infer_entity(signal):
  haystack = " ".join(
    [
      signal.get("title", ""),
      signal.get("source", {}).get("name", ""),
      " ".join(signal.get("tags", [])),
    ]
  ).lower()
  for entity in PRIMARY_DOMAIN_KEYWORDS:
    if re.search(rf"\b{re.escape(entity)}\b", haystack):
      return entity
  return ""


def is_primary_project_source(signal, domain, source_label):
  source_name = signal.get("source", {}).get("name", "").lower()
  source_url = signal.get("source", {}).get("url", "")
  if domain == "github.com" and (
    "github" in source_name
    or "/releases/" in source_url
    or "/releases/tag/" in source_url
  ):
    return True
  if domain == "huggingface.co" and (
    "hugging" in source_name
    or "model card" in source_name
    or "/blog/" in source_url
  ):
    return True
  return source_label in {"githubrelease", "modelcard"}


def is_primary_public_source(source_name, domain):
  normalized_source = normalize_token(source_name)
  if domain.endswith(".europa.eu") and (
    "comision" in normalized_source
    or "commission" in normalized_source
    or "european" in normalized_source
  ):
    return True
  if domain.endswith(".gov.uk") and (
    "securityinstitute" in normalized_source
    or "aisi" in normalized_source
    or "government" in normalized_source
  ):
    return True
  return False


def normalize_token(value):
  return re.sub(r"[^a-z0-9]+", "", value.lower())


def validation_result(signal, status, source_type, domain, reason):
  source = signal.get("source", {})
  return {
    "id": signal.get("id"),
    "title": signal.get("title"),
    "status": status,
    "sourceType": source_type,
    "reason": reason,
    "source": {
      "name": source.get("name"),
      "url": source.get("url"),
      "domain": domain,
      "publishedAt": source.get("publishedAt"),
    },
  }


def build_response(payload, day, limit, order):
  selected = sort_signals(payload["signals"], order)[:limit]
  return {
    "day": day,
    "order": order,
    "limit": limit,
    "count": len(selected),
    "validations": [validate_signal(signal) for signal in selected],
  }


def main():
  args = parse_args()
  try:
    payload = load_daily_signals(args.data_dir, args.day)
    response = build_response(payload, args.day, args.limit, args.order)
  except (FileNotFoundError, json.JSONDecodeError, ValueError) as error:
    print(str(error), file=sys.stderr)
    return 1

  print(json.dumps(response, ensure_ascii=False, indent=2))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
