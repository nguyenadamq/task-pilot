import assert from "node:assert/strict";
import test from "node:test";
import { generateOptimizedSchedule } from "./scheduler.js";

const START = new Date(2026, 0, 5, 8, 0, 0);

function task(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    title: overrides.title || "Task",
    description: "",
    priority: overrides.priority || "medium",
    duration_minutes: overrides.duration_minutes ?? 60,
    deadline: overrides.deadline ?? null,
    status: overrides.status || "todo",
    fixed_start: overrides.fixed_start ?? null,
    fixed_end: overrides.fixed_end ?? null,
    splittable: overrides.splittable ?? false,
    asap: overrides.asap ?? false,
    created_at: overrides.created_at || new Date(2026, 0, 1, 9).toISOString(),
  };
}

function rule(kind, day_of_week, start_time, end_time) {
  return {
    id: crypto.randomUUID(),
    title: kind,
    kind,
    day_of_week,
    start_time,
    end_time,
  };
}

function makePlan({ tasks = [], availabilityRules = [], preferences = {} }) {
  return generateOptimizedSchedule({
    tasks,
    availabilityRules,
    preferences,
    startDate: START,
    now: START,
  });
}

test("uses preferred work windows before late overflow time", () => {
  const plan = makePlan({
    tasks: [task({ id: "asap", title: "ASAP task", asap: true })],
    availabilityRules: [rule("sleep", 1, "23:00", "07:00")],
    preferences: {
      preferred_start_time: "09:00",
      preferred_end_time: "17:00",
    },
  });

  assert.equal(plan.unscheduled_tasks.length, 0);
  assert.equal(new Date(plan.blocks[0].start_at).getHours(), 9);
});

test("does not schedule over hard work blocks", () => {
  const plan = makePlan({
    tasks: [task({ id: "reading", duration_minutes: 90 })],
    availabilityRules: [rule("work", 1, "09:00", "17:00")],
    preferences: {
      preferred_start_time: "08:00",
      preferred_end_time: "18:00",
    },
  });

  const block = plan.blocks.find((item) => item.task_id === "reading");

  assert.ok(block);
  assert.ok(new Date(block.end_at) <= new Date(2026, 0, 5, 9) || new Date(block.start_at) >= new Date(2026, 0, 5, 17));
});

test("schedules deadlines before no-deadline tasks", () => {
  const plan = makePlan({
    tasks: [
      task({ id: "later", title: "Later", asap: true }),
      task({ id: "deadline", title: "Deadline", deadline: new Date(2026, 0, 5, 12).toISOString() }),
    ],
  });

  const deadlineBlock = plan.blocks.find((item) => item.task_id === "deadline");
  const laterBlock = plan.blocks.find((item) => item.task_id === "later");

  assert.ok(deadlineBlock);
  assert.ok(laterBlock);
  assert.ok(new Date(deadlineBlock.start_at) < new Date(laterBlock.start_at));
});

test("splits large splittable tasks into chunks", () => {
  const plan = makePlan({
    tasks: [task({ id: "project", duration_minutes: 180, splittable: true })],
    preferences: {
      max_work_minutes_per_day: 240,
    },
  });

  const chunks = plan.blocks.filter((item) => item.task_id === "project");

  assert.equal(plan.unscheduled_tasks.length, 0);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks.reduce((total, item) => total + item.duration_minutes, 0), 180);
});

test("leaves completed tasks out of generated schedule", () => {
  const plan = makePlan({
    tasks: [task({ id: "done", status: "complete" })],
  });

  assert.equal(plan.blocks.length, 0);
  assert.equal(plan.unscheduled_tasks.length, 0);
});

test("reports unscheduled work when daily capacity is exhausted", () => {
  const plan = makePlan({
    tasks: [task({ id: "too-large", duration_minutes: 420 })],
    preferences: {
      max_work_minutes_per_day: 120,
      horizon_days: 1,
      overflow_allowed: false,
    },
  });

  assert.equal(plan.blocks.length, 0);
  assert.equal(plan.unscheduled_tasks.length, 1);
  assert.match(plan.unscheduled_tasks[0].reason, /long enough|time/i);
});
