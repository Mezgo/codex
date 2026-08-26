import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "validate-primary-sources.py"


class ValidatePrimarySourcesTest(unittest.TestCase):
  def setUp(self):
    self.temp_dir = tempfile.TemporaryDirectory()
    self.addCleanup(self.temp_dir.cleanup)
    self.data_dir = Path(self.temp_dir.name)
    self.write_daily_file(
      "2026-07-31",
      [
        self.signal(
          "secondary-news",
          "high",
          "Anthropic publica Claude Opus 5",
          "Axios",
          "https://www.axios.com/2026/07/24/anthropic-releases-new-model-opus-5",
        ),
        self.signal(
          "invalid-url",
          "critical",
          "OpenAI lanza GPT-5.6",
          "OpenAI",
          "not-a-url",
        ),
        self.signal(
          "primary-release",
          "medium",
          "OpenAI lanza GPT-5.6",
          "OpenAI",
          "https://openai.com/index/gpt-5-6/",
        ),
      ],
    )

  def signal(self, signal_id, impact_level, title, source_name, source_url):
    return {
      "id": signal_id,
      "title": title,
      "source": {
        "name": source_name,
        "url": source_url,
        "publishedAt": "2026-07-31",
      },
      "evidence": "Evidence",
      "impact": {
        "level": impact_level,
        "summary": "Impact summary",
      },
      "action": "Action",
      "status": "active",
      "tags": ["openai", "models"],
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

  def test_marks_matching_vendor_url_as_primary_source(self):
    result = self.run_script("--day", "2026-07-31", "--limit", "3", "--order", "input")

    self.assertEqual(result.returncode, 0, result.stderr)
    payload = json.loads(result.stdout)
    validations = {item["id"]: item for item in payload["validations"]}
    self.assertEqual(validations["primary-release"]["status"], "passed")
    self.assertEqual(validations["primary-release"]["sourceType"], "primary")

  def test_warns_when_source_is_a_media_report(self):
    result = self.run_script("--day", "2026-07-31", "--limit", "3", "--order", "input")

    self.assertEqual(result.returncode, 0, result.stderr)
    validations = {item["id"]: item for item in json.loads(result.stdout)["validations"]}
    self.assertEqual(validations["secondary-news"]["status"], "warning")
    self.assertEqual(validations["secondary-news"]["sourceType"], "secondary")

  def test_fails_when_source_url_is_not_valid(self):
    result = self.run_script("--day", "2026-07-31", "--limit", "3", "--order", "input")

    self.assertEqual(result.returncode, 0, result.stderr)
    validations = {item["id"]: item for item in json.loads(result.stdout)["validations"]}
    self.assertEqual(validations["invalid-url"]["status"], "failed")
    self.assertEqual(validations["invalid-url"]["sourceType"], "invalid")

  def test_applies_limit_and_order_before_validation(self):
    result = self.run_script("--day", "2026-07-31", "--limit", "2", "--order", "impact-desc")

    self.assertEqual(result.returncode, 0, result.stderr)
    payload = json.loads(result.stdout)
    self.assertEqual(payload["count"], 2)
    self.assertEqual([item["id"] for item in payload["validations"]], ["invalid-url", "secondary-news"])


if __name__ == "__main__":
  unittest.main()
