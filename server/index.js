import cors from "cors";
import "dotenv/config";
import express from "express";
import { generateOptimizedSchedule } from "../src/services/scheduler.js";
import { assertSupabaseConfig, getOrCreatePreferences, requireUser } from "./supabase.js";

const app = express();
const port = Number(process.env.PORT || 8000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "task-pilot-api" });
});

app.use("/api", requireUser);

app.get("/api/bootstrap", async (req, res, next) => {
  try {
    const [tasks, availabilityRules, preferences, schedule] = await Promise.all([
      listRows(req.supabase, "tasks", req.user.id, "created_at", false),
      listRows(req.supabase, "availability_rules", req.user.id, "day_of_week", true),
      getOrCreatePreferences(req.supabase, req.user.id),
      getLatestSchedule(req.supabase, req.user.id),
    ]);

    res.json({ tasks, availabilityRules, preferences, schedule });
  } catch (error) {
    next(error);
  }
});

app.get("/api/tasks", async (req, res, next) => {
  try {
    res.json(await listRows(req.supabase, "tasks", req.user.id, "created_at", false));
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("tasks")
      .insert([{ ...cleanTask(req.body), user_id: req.user.id }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/tasks/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("tasks")
      .update(cleanTask(req.body, true))
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
  try {
    const { error } = await req.supabase
      .from("tasks")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) {
      throw error;
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks/:id/complete", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("tasks")
      .update({ status: "complete" })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await req.supabase
      .from("schedule_blocks")
      .delete()
      .eq("task_id", req.params.id)
      .eq("user_id", req.user.id)
      .neq("status", "complete");

    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get("/api/availability", async (req, res, next) => {
  try {
    res.json(await listRows(req.supabase, "availability_rules", req.user.id, "day_of_week", true));
  } catch (error) {
    next(error);
  }
});

app.post("/api/availability", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("availability_rules")
      .insert([{ ...cleanAvailabilityRule(req.body), user_id: req.user.id }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/availability/:id", async (req, res, next) => {
  try {
    const { error } = await req.supabase
      .from("availability_rules")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) {
      throw error;
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/preferences", async (req, res, next) => {
  try {
    res.json(await getOrCreatePreferences(req.supabase, req.user.id));
  } catch (error) {
    next(error);
  }
});

app.put("/api/preferences", async (req, res, next) => {
  try {
    await getOrCreatePreferences(req.supabase, req.user.id);
    const { data, error } = await req.supabase
      .from("schedule_preferences")
      .update(cleanPreferences(req.body))
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get("/api/schedule", async (req, res, next) => {
  try {
    res.json(await getLatestSchedule(req.supabase, req.user.id));
  } catch (error) {
    next(error);
  }
});

app.post("/api/schedule/generate", async (req, res, next) => {
  try {
    const schedule = await generateAndStoreSchedule({
      supabase: req.supabase,
      userId: req.user.id,
      mode: req.body.mode || "generated",
    });

    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
});

app.post("/api/schedule/blocks/:id/extend", async (req, res, next) => {
  try {
    const minutes = Math.max(1, Number(req.body.minutes || 15));
    const { data: block, error } = await req.supabase
      .from("schedule_blocks")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (error) {
      throw error;
    }

    const endAt = new Date(block.end_at);
    endAt.setMinutes(endAt.getMinutes() + minutes);

    const { error: updateError } = await req.supabase
      .from("schedule_blocks")
      .update({
        end_at: endAt.toISOString(),
        duration_minutes: Number(block.duration_minutes || 0) + minutes,
        status: "in_progress",
      })
      .eq("id", block.id)
      .eq("user_id", req.user.id);

    if (updateError) {
      throw updateError;
    }

    res.json(
      await generateAndStoreSchedule({
        supabase: req.supabase,
        userId: req.user.id,
        mode: "reoptimized",
      })
    );
  } catch (error) {
    next(error);
  }
});

async function generateAndStoreSchedule({ supabase, userId, mode }) {
  const now = new Date();
  const [tasks, availabilityRules, preferences, latestSchedule] = await Promise.all([
    listRows(supabase, "tasks", userId, "created_at", false),
    listRows(supabase, "availability_rules", userId, "day_of_week", true),
    getOrCreatePreferences(supabase, userId),
    getLatestSchedule(supabase, userId),
  ]);

  const lockedBlocks = (latestSchedule?.blocks || []).filter(
    (block) => block.status === "complete" || new Date(block.start_at) < now
  );
  const plan = generateOptimizedSchedule({
    tasks,
    availabilityRules,
    preferences,
    startDate: now,
    now,
    lockedBlocks,
  });

  const { data: run, error: runError } = await supabase
    .from("schedule_runs")
    .insert([
      {
        user_id: userId,
        mode,
        horizon_start: plan.horizon_start,
        horizon_end: plan.horizon_end,
        summary: {
          ...plan.summary,
          unscheduled_tasks: plan.unscheduled_tasks,
        },
      },
    ])
    .select()
    .single();

  if (runError) {
    throw runError;
  }

  if (plan.blocks.length) {
    const { error: blocksError } = await supabase.from("schedule_blocks").insert(
      plan.blocks.map((block) => ({
        ...block,
        user_id: userId,
        schedule_run_id: run.id,
      }))
    );

    if (blocksError) {
      throw blocksError;
    }
  }

  return await getLatestSchedule(supabase, userId, run.id);
}

async function getLatestSchedule(supabase, userId, runId = null) {
  const runQuery = supabase
    .from("schedule_runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: runs, error: runError } = runId
    ? await supabase.from("schedule_runs").select("*").eq("id", runId).eq("user_id", userId).limit(1)
    : await runQuery;

  if (runError) {
    throw runError;
  }

  const run = runs?.[0] || null;

  if (!run) {
    return null;
  }

  const { data: blocks, error: blocksError } = await supabase
    .from("schedule_blocks")
    .select("*")
    .eq("schedule_run_id", run.id)
    .eq("user_id", userId)
    .order("start_at", { ascending: true });

  if (blocksError) {
    throw blocksError;
  }

  return { run, blocks };
}

async function listRows(supabase, table, userId, orderColumn, ascending) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order(orderColumn, { ascending });

  if (error) {
    throw error;
  }

  return data || [];
}

function cleanTask(values, partial = false) {
  const fields = [
    "title",
    "description",
    "priority",
    "duration_minutes",
    "deadline",
    "status",
    "fixed_start",
    "fixed_end",
    "splittable",
    "asap",
  ];

  return cleanFields(values, fields, partial);
}

function cleanAvailabilityRule(values) {
  return cleanFields(values, ["title", "kind", "day_of_week", "start_time", "end_time"], false);
}

function cleanPreferences(values) {
  return cleanFields(
    values,
    [
      "preferred_start_time",
      "preferred_end_time",
      "max_work_minutes_per_day",
      "buffer_minutes",
      "horizon_days",
      "overflow_allowed",
    ],
    true
  );
}

function cleanFields(values, fields, partial) {
  const result = {};

  for (const field of fields) {
    if (!partial || Object.hasOwn(values, field)) {
      result[field] = values[field] === "" ? null : values[field];
    }
  }

  return result;
}

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Unexpected server error." });
});

try {
  assertSupabaseConfig();
  app.listen(port, () => {
    console.log(`Task Pilot API listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
