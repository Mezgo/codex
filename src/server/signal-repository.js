const { validateDailySignals } = require("./daily-signal-schema");
const { createServerSupabaseClient } = require("./supabase-client");

const IMPACT_WEIGHT = {
  low: 1,
  medium: 2,
  "medium-high": 3,
  high: 4,
  critical: 5
};

const SUPPORTED_ORDERS = new Set([
  "impact-desc",
  "impact-asc",
  "published-desc",
  "published-asc",
  "input"
]);

function mapDailyRunRow(payload) {
  return {
    run_date: payload.query.date,
    prompt: payload.query.prompt,
    language: payload.query.language,
    topics: payload.query.topics,
    generated_at: payload.generatedAt,
    source_mode: payload.query.sourceMode || "manual"
  };
}

function mapSignalRow(runId, signal) {
  return {
    id: signal.id,
    run_id: runId,
    title: signal.title,
    source_name: signal.source.name,
    source_url: signal.source.url,
    published_at: signal.source.publishedAt,
    evidence: signal.evidence,
    impact_level: signal.impact.level,
    impact_summary: signal.impact.summary,
    action: signal.action,
    status: signal.status,
    tags: signal.tags || [],
    payload: signal
  };
}

function mapSignalSourceRows(signal) {
  return (signal.corroboratingSources || []).map((source) => ({
    signal_id: signal.id,
    name: source.name,
    url: source.url,
    source_type: source.type,
    published_at: source.publishedAt || null,
    note: source.note || null
  }));
}

async function saveDailySignals(payload, options = {}) {
  validateDailySignals(payload);
  const supabase = options.supabaseClient || createServerSupabaseClient(options.env);

  const { data: run, error: runError } = await supabase
    .from("daily_runs")
    .upsert(mapDailyRunRow(payload), { onConflict: "run_date,prompt" })
    .select("id")
    .single();
  throwIfSupabaseError(runError);

  let signalsInserted = 0;
  let signalsUpdated = 0;
  let sourcesInserted = 0;

  for (const signal of payload.signals) {
    const { data: existing, error: existingError } = await supabase
      .from("signals")
      .select("id")
      .eq("id", signal.id)
      .maybeSingle();
    throwIfSupabaseError(existingError);

    const { error: signalError } = await supabase
      .from("signals")
      .upsert(mapSignalRow(run.id, signal), { onConflict: "id" });
    throwIfSupabaseError(signalError);

    if (existing) {
      signalsUpdated += 1;
    } else {
      signalsInserted += 1;
    }

    const { error: deleteError } = await supabase
      .from("signal_sources")
      .delete()
      .eq("signal_id", signal.id);
    throwIfSupabaseError(deleteError);

    const sourceRows = mapSignalSourceRows(signal);
    if (sourceRows.length > 0) {
      const { error: sourceError } = await supabase
        .from("signal_sources")
        .insert(sourceRows);
      throwIfSupabaseError(sourceError);
      sourcesInserted += sourceRows.length;
    }
  }

  return {
    runId: run.id,
    signalsInserted,
    signalsUpdated,
    sourcesInserted
  };
}

async function queryDailySignals(params, options = {}) {
  const day = requireDay(params.day);
  const limit = parseLimit(params.limit);
  const order = parseOrder(params.order || "impact-desc");
  const supabase = options.supabaseClient || createServerSupabaseClient(options.env);

  const { data: run, error: runError } = await supabase
    .from("daily_runs")
    .select("id, run_date, prompt, language, topics")
    .eq("run_date", day)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfSupabaseError(runError);

  if (!run) {
    return {
      day,
      order,
      limit,
      count: 0,
      signals: []
    };
  }

  const { data: rows, error: signalsError } = await supabase
    .from("signals")
    .select("*")
    .eq("run_id", run.id);
  throwIfSupabaseError(signalsError);

  return buildQueryResponse({
    run,
    signals: rows || [],
    limit,
    order
  });
}

function buildQueryResponse({ run, signals, limit, order }) {
  const selectedSignals = sortSignalRows(signals, order)
    .slice(0, limit)
    .map((row) => row.payload || mapSignalPayload(row));

  return {
    day: run.run_date,
    order,
    limit,
    count: selectedSignals.length,
    query: {
      date: run.run_date,
      prompt: run.prompt,
      language: run.language,
      topics: run.topics || []
    },
    signals: selectedSignals
  };
}

function sortSignalRows(rows, order) {
  const indexed = rows.map((row, index) => ({ row, index }));
  if (order === "input") {
    return rows;
  }
  if (order === "impact-desc") {
    return indexed
      .sort((left, right) =>
        impactWeight(right.row) - impactWeight(left.row) || left.index - right.index
      )
      .map(({ row }) => row);
  }
  if (order === "impact-asc") {
    return indexed
      .sort((left, right) =>
        impactWeight(left.row) - impactWeight(right.row) || left.index - right.index
      )
      .map(({ row }) => row);
  }
  if (order === "published-desc") {
    return indexed
      .sort((left, right) =>
        comparePublished(right.row, left.row) || left.index - right.index
      )
      .map(({ row }) => row);
  }
  if (order === "published-asc") {
    return indexed
      .sort((left, right) =>
        comparePublished(left.row, right.row) || left.index - right.index
      )
      .map(({ row }) => row);
  }
  throw new Error(`Unsupported order: ${order}`);
}

function mapSignalPayload(row) {
  return {
    id: row.id,
    title: row.title,
    source: {
      name: row.source_name,
      url: row.source_url,
      publishedAt: row.published_at
    },
    evidence: row.evidence,
    impact: {
      level: row.impact_level,
      summary: row.impact_summary
    },
    action: row.action,
    status: row.status,
    tags: row.tags || []
  };
}

function impactWeight(row) {
  const level = row.impact_level || row.payload?.impact?.level;
  return IMPACT_WEIGHT[level] || 0;
}

function comparePublished(left, right) {
  const leftDate = left.published_at || left.payload?.source?.publishedAt || "";
  const rightDate = right.published_at || right.payload?.source?.publishedAt || "";
  return leftDate.localeCompare(rightDate);
}

function requireDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) {
    throw new Error("day must use YYYY-MM-DD format");
  }
  return day;
}

function parseLimit(value) {
  const parsed = Number.parseInt(value || "5", 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("limit must be a positive integer");
  }
  return parsed;
}

function parseOrder(order) {
  if (!SUPPORTED_ORDERS.has(order)) {
    throw new Error(`Unsupported order: ${order}`);
  }
  return order;
}

function throwIfSupabaseError(error) {
  if (error) {
    throw new Error(error.message || String(error));
  }
}

module.exports = {
  buildQueryResponse,
  mapDailyRunRow,
  mapSignalRow,
  mapSignalSourceRows,
  queryDailySignals,
  saveDailySignals,
  sortSignalRows,
  validateDailySignals
};
