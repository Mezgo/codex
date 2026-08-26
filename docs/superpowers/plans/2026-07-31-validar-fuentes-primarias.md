# Validar Fuentes Primarias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local AI Radar tool that validates whether the selected daily signals use primary sources, and add a Codex skill that invokes it for primary-source consultation requests.

**Architecture:** Reuse the existing daily signals JSON contract and query semantics. The validator is a standalone Python CLI under `scripts/` with deterministic local heuristics and JSON output; the skill lives in Codex skills and instructs agents to run that tool before answering.

**Tech Stack:** Python 3 standard library, `unittest`, local Codex skill files.

## Global Constraints

- Do not invent external APIs, databases, commands, or integrations.
- Keep local data under `data/fixtures/daily-signals/YYYY-MM-DD.json`.
- Preserve 2-space indentation in project code.
- Use tests before production code for behavior changes.
- The validator must not browse the web; it validates source type from local metadata and URL heuristics.

---

### Task 1: Primary Source Validator CLI

**Files:**
- Create: `tests/test_validate_primary_sources.py`
- Create: `scripts/validate-primary-sources.py`

**Interfaces:**
- Consumes: daily signal JSON files with root `kind`, `query.date`, and `signals`.
- Produces: CLI command `python3 scripts/validate-primary-sources.py --day YYYY-MM-DD --limit N --order impact-desc`.
- Produces JSON with `day`, `order`, `limit`, `count`, and `validations`.

- [ ] **Step 1: Write failing tests**

Create `tests/test_validate_primary_sources.py` with subprocess tests for:
- A primary source URL matching a known subject returns `status: "passed"`.
- A media/reporting URL returns `status: "warning"`.
- An invalid source URL returns `status: "failed"`.
- `--limit` and `--order` select the same N signals users asked for.

- [ ] **Step 2: Run tests to verify failure**

Run: `python3 -m unittest tests/test_validate_primary_sources.py -v`

Expected: fail because `scripts/validate-primary-sources.py` does not exist.

- [ ] **Step 3: Implement the CLI**

Create `scripts/validate-primary-sources.py` with:
- Argument parser for `--day`, `--limit`, `--order`, and `--data-dir`.
- Local daily JSON loading and basic contract checks.
- Sorting semantics matching `query-daily-signals.py`.
- URL validation using `urllib.parse`.
- Heuristics for `passed`, `warning`, and `failed`.
- JSON output suitable for a skill to summarize.

- [ ] **Step 4: Run tests to verify pass**

Run: `python3 -m unittest tests/test_validate_primary_sources.py -v`

Expected: pass.

### Task 2: Codex Skill For Primary Source Consultation

**Files:**
- Create staged local files under `.codex/generated-skills/consultar-fuentes-primarias/`
- Install to: `/home/violet_tachyon/.codex/skills/consultar-fuentes-primarias/`

**Interfaces:**
- Consumes: user asks for primary sources of AI Radar signals.
- Produces: skill `consultar-fuentes-primarias` whose instructions require running the validator CLI.

- [ ] **Step 1: Create skill files**

Create:
- `SKILL.md` with frontmatter name and trigger description.
- `agents/openai.yaml` with display metadata.

- [ ] **Step 2: Validate skill shape**

Run: `python3 /home/violet_tachyon/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/generated-skills/consultar-fuentes-primarias`

Expected: pass.

- [ ] **Step 3: Install skill**

Copy generated skill folder to `/home/violet_tachyon/.codex/skills/consultar-fuentes-primarias/`.

### Task 3: Final Verification

**Files:**
- Read: `scripts/validate-primary-sources.py`
- Read: `/home/violet_tachyon/.codex/skills/consultar-fuentes-primarias/SKILL.md`

**Interfaces:**
- Consumes: finished implementation.
- Produces: verification evidence for the user.

- [ ] **Step 1: Run full relevant test suite**

Run: `python3 -m unittest tests/test_query_daily_signals.py tests/test_validate_primary_sources.py -v`

Expected: all tests pass.

- [ ] **Step 2: Run validator on fixture**

Run: `python3 scripts/validate-primary-sources.py --day 2026-07-31 --limit 5 --order impact-desc`

Expected: JSON output containing 5 validations.

- [ ] **Step 3: Inspect git diff**

Run: `git diff -- scripts/validate-primary-sources.py tests/test_validate_primary_sources.py docs/superpowers/plans/2026-07-31-validar-fuentes-primarias.md`

Expected: only intended repo changes.
