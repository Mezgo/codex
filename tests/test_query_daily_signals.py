import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "query-daily-signals.py"


class QueryDailySignalsTest(unittest.TestCase):
  def setUp(self):
    self.temp_dir = tempfile.TemporaryDirectory()
    self.addCleanup(self.temp_dir.cleanup)
    self.data_dir = Path(self.temp_dir.name)
    self.write_daily_file(
      "2026-07-31",
      [
        self.signal("low-old", "low", "2026-07-01"),
        self.signal("critical-new", "critical", "2026-07-31"),
        self.signal("high-mid", "high", "2026-07-15"),
      ],
    )

  def signal(self, signal_id, impact_level, published_at):
    return {
      "id": signal_id,
      "title": signal_id,
      "source": {
        "name": "Example",
        "url": f"https://example.com/{signal_id}",
        "publishedAt": published_at,
      },
      "evidence": "Evidence",
      "impact": {
        "level": impact_level,
        "summary": "Impact summary",
      },
      "action": "Action",
      "status": "active",
    }

  def write_daily_file(self, day, signals):
    payload = {
      "schemaVersion": "1.0.0",
      "kind": "ai-radar.daily-signals",
      "generatedAt": f"{day}T00:00:00Z",
      "query": {
        "date": day,
        "prompt": "Daily search",
        "language": "es",
        "topics": ["ai"],
      },
      "signals": signals,
    }
    path = self.data_dir / f"{day}.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

  def run_script(self, *args):
    return subprocess.run(
      [sys.executable, str(SCRIPT), "--data-dir", str(self.data_dir), *args],
      check=False,
      capture_output=True,
      text=True,
    )

  def test_returns_limit_signals_for_selected_day_ordered_by_impact_desc(self):
    result = self.run_script("--day", "2026-07-31", "--limit", "2", "--order", "impact-desc")

    self.assertEqual(result.returncode, 0, result.stderr)
    payload = json.loads(result.stdout)
    self.assertEqual(payload["day"], "2026-07-31")
    self.assertEqual(payload["count"], 2)
    self.assertEqual([signal["id"] for signal in payload["signals"]], ["critical-new", "high-mid"])

  def test_returns_signals_ordered_by_published_asc(self):
    result = self.run_script("--day", "2026-07-31", "--limit", "3", "--order", "published-asc")

    self.assertEqual(result.returncode, 0, result.stderr)
    payload = json.loads(result.stdout)
    self.assertEqual([signal["id"] for signal in payload["signals"]], ["low-old", "high-mid", "critical-new"])

  def test_reports_missing_daily_file(self):
    result = self.run_script("--day", "2026-08-01", "--limit", "1")

    self.assertEqual(result.returncode, 1)
    self.assertIn("No existe el JSON diario", result.stderr)


if __name__ == "__main__":
  unittest.main()
