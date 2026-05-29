import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { generateWeeklySchedule, repairWeeklySchedule } from "./scheduler.js";

const START_DATE = new Date(2026, 0, 5);

function task(overrides = {}) {
  return {
    id: overrides.id || randomUUID(),
    title: overrides.title || "Task",
    description: "",
    duration_minutes: overrides.duration_minutes ?? 60,
    deadline: overrides.deadline ?? null,
    priority: overrides.priority || "medium",
    fixed_start: overrides.fixed_start ?? null,
    fixed_end: overrides.fixed_end ?? null,
    status: overrides.status || "todo",
    splittable: overrides.splittable ?? false,
    created_at: overrides.created_at || new Date(2026, 0, 1, 9).toISOString(),
  };
}

function fixedEvent(day_of_week, start_time, end_time) {
  return {
    id: randomUUID(),
    title: "Busy block",
    day_of_week,
    start_time,
    end_time,
  };
}

function sleepRule(day_of_week, start_time, end_time) {
  return {
    id: randomUUID(),
    day_of_week,
    start_time,
    end_time,
  };
}

function makePlan({ tasks = [], sleepRules = [], fixedEvents = [] }) {
  return generateWeeklySchedule({
    tasks,
    sleepRules,
    fixedEvents,
    startDate: START_DATE,
  });
}

test("respects sleep blocks and recurring fixed events", () => {
  const plan = makePlan({
    tasks: [task({ id: "reading", title: "Reading" })],
    sleepRules: [sleepRule(1, "00:00", "08:00")],
    fixedEvents: [fixedEvent(1, "09:00", "10:00")],
  });

  assert.equal(plan.unscheduledTasks.length, 0);
  assert.equal(plan.scheduledItems.length, 1);

  const item = plan.scheduledItems[0];
  const start = new Date(item.start);
  const end = new Date(item.end);

  assert.equal(start.getDay(), 1);
  assert.ok(start.getHours() >= 8);
  assert.ok(end <= new Date(2026, 0, 5, 9) || start >= new Date(2026, 0, 5, 10));
});

test("schedules earlier deadlines before later deadlines when possible", () => {
  const early = task({
    id: "early",
    title: "Early deadline",
    deadline: new Date(2026, 0, 5, 12).toISOString(),
  });
  const later = task({
    id: "later",
    title: "Later deadline",
    deadline: new Date(2026, 0, 6, 12).toISOString(),
  });

  const plan = makePlan({ tasks: [later, early] });
  const earlyItem = plan.scheduledItems.find((item) => item.taskId === "early");
  const laterItem = plan.scheduledItems.find((item) => item.taskId === "later");

  assert.ok(earlyItem);
  assert.ok(laterItem);
  assert.ok(new Date(earlyItem.start) < new Date(laterItem.start));
});

test("favors high priority work when limited time is available", () => {
  const plan = makePlan({
    tasks: [
      task({ id: "low", title: "Low priority", priority: "low", duration_minutes: 360 }),
      task({ id: "high", title: "High priority", priority: "high", duration_minutes: 360 }),
    ],
    sleepRules: Array.from({ length: 7 }, (_, day) =>
      day === 1 ? sleepRule(day, "06:00", "23:59") : sleepRule(day, "00:00", "23:59")
    ),
  });

  assert.ok(plan.scheduledItems.some((item) => item.taskId === "high"));
  assert.ok(!plan.scheduledItems.some((item) => item.taskId === "low"));
  assert.ok(plan.unscheduledTasks.some((item) => item.id === "low"));
});

test("splits large splittable tasks into multiple blocks", () => {
  const plan = makePlan({
    tasks: [
      task({
        id: "project",
        title: "Project draft",
        duration_minutes: 180,
        splittable: true,
      }),
    ],
    sleepRules: [sleepRule(1, "03:00", "23:59")],
  });

  const projectBlocks = plan.scheduledItems.filter((item) => item.taskId === "project");

  assert.equal(plan.unscheduledTasks.length, 0);
  assert.ok(projectBlocks.length >= 2);
  assert.equal(
    projectBlocks.reduce((total, item) => total + item.durationMinutes, 0),
    180
  );
});

test("keeps impossible tasks unscheduled with a readable reason", () => {
  const fullWeekSleep = Array.from({ length: 7 }, (_, day) => sleepRule(day, "00:00", "23:59"));
  const plan = makePlan({
    tasks: [task({ id: "impossible", title: "Impossible task", duration_minutes: 120 })],
    sleepRules: fullWeekSleep,
  });

  assert.equal(plan.scheduledItems.length, 0);
  assert.equal(plan.unscheduledTasks.length, 1);
  assert.match(plan.unscheduledTasks[0].reason, /free block|free time|available time/i);
});

test("does not schedule completed tasks", () => {
  const plan = makePlan({
    tasks: [task({ id: "done", title: "Finished task", status: "done" })],
  });

  assert.equal(plan.scheduledItems.length, 0);
  assert.equal(plan.unscheduledTasks.length, 0);
});

test("repair mode does not duplicate completed work", () => {
  const originalPlan = makePlan({
    tasks: [task({ id: "essay", title: "Essay", duration_minutes: 60 })],
  });
  const repairedPlan = repairWeeklySchedule({
    originalPlan,
    tasks: [task({ id: "essay", title: "Essay", duration_minutes: 60, status: "done" })],
    sleepRules: [],
    fixedEvents: [],
    startDate: START_DATE,
    now: new Date(2026, 0, 5, 1),
  });

  assert.equal(repairedPlan.scheduledItems.length, 0);
  assert.equal(repairedPlan.unscheduledTasks.length, 0);
});
