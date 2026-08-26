#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


IMPACT_WEIGHT = {
  "low": 1,
  "medium": 2,
  "medium-high": 3,
  "high": 4,
  "critical": 5,
}


def parse_args():
  parser = argparse.ArgumentParser(
    description="Consulta senales diarias de AI Radar desde archivos JSON locales."
  )
  parser.add_argument("--day", required=True, help="Dia a consultar en formato YYYY-MM-DD.")
  parser.add_argument("--limit", "-n", type=positive_int, default=5, help="Cantidad de senales a devolver.")
  parser.add_argument(
    "--order",
    default="impact-desc",
    choices=["impact-desc", "impact-asc", "published-desc", "published-asc", "input"],
    help="Orden de las senales devueltas.",
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

  signals = payload.get("signals")
  if not isinstance(signals, list):
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


def build_response(payload, day, limit, order):
  sorted_signals = sort_signals(payload["signals"], order)
  selected = sorted_signals[:limit]
  return {
    "day": day,
    "order": order,
    "limit": limit,
    "count": len(selected),
    "signals": selected,
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
