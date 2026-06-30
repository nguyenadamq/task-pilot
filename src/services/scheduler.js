const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SPLIT_MINUTES = 30;

export const DEFAULT_PREFERENCES = {
  preferred_start_time: "09:00",
  preferred_end_time: "18:00",
  max_work_minutes_per_day: 300,
  buffer_minutes: 10,
  horizon_days: 7,
  overflow_allowed: true,
};

const HARD_RULE_KINDS = new Set(["sleep", "work", "unavailable"]);

export function generateOptimizedSchedule({
  tasks = [],
  availabilityRules = [],
  preferences = {},
  startDate = new Date(),
  now = startDate,
  lockedBlocks = [],
}) {
  const mergedPreferences = normalizePreferences(preferences);
  const horizonStart = startOfMinute(new Date(now));
  const horizonEnd = addDays(startOfDate(new Date(startDate)), mergedPreferences.horizon_days);
  const days = buildDays(horizonStart, mergedPreferences.horizon_days);
  const usableSlotsByDay = buildUsableSlots(days, availabilityRules, tasks, lockedBlocks, mergedPreferences);
  const minutesByDay = getLockedMinutesByDay(lockedBlocks);
  const scheduledBlocks = normalizeLockedBlocks(lockedBlocks);
  const unscheduledTasks = [];
  const taskBlocksById = new Map();

  for (const task of getFixedTasks(tasks, horizonStart, horizonEnd)) {
    if (task.status === "complete") {
      continue;
    }

    scheduledBlocks.push(taskToFixedBlock(task));
    addTaskBlock(taskBlocksById, task.id, {
      start_at: task.fixed_start,
      end_at: task.fixed_end,
      duration_minutes: getMinutesBetween(new Date(task.fixed_start), new Date(task.fixed_end)),
    });
  }

  const flexibleTasks = sortTasksForScheduling(getFlexibleTasks(tasks));

  for (const task of flexibleTasks) {
    let remainingMinutes = Number(task.duration_minutes || 0);
    const placedBlocks = [];

    if (task.splittable) {
      remainingMinutes = placeSplittableTask({
        task,
        usableSlotsByDay,
        minutesByDay,
        scheduledBlocks,
        placedBlocks,
        remainingMinutes,
        preferences: mergedPreferences,
      });
    } else {
      const block = findSingleBlock({
        task,
        usableSlotsByDay,
        minutesByDay,
        preferences: mergedPreferences,
      });

      if (block) {
        const end = addMinutes(block.slot.start, task.duration_minutes);
        const scheduledBlock = makeScheduledBlock(task, block.slot.start, end, task.duration_minutes);
        scheduledBlocks.push(scheduledBlock);
        placedBlocks.push(scheduledBlock);
        consumeSlot(block.slot, end, mergedPreferences.buffer_minutes);
        minutesByDay[block.dateKey] = (minutesByDay[block.dateKey] || 0) + task.duration_minutes;
        remainingMinutes = 0;
      }
    }

    for (const block of placedBlocks) {
      addTaskBlock(taskBlocksById, task.id, block);
    }

    if (remainingMinutes > 0) {
      unscheduledTasks.push({
        id: task.id,
        title: task.title,
        remaining_minutes: remainingMinutes,
        reason: getUnscheduledReason(task, remainingMinutes, placedBlocks),
      });
    }
  }

  const orderedBlocks = scheduledBlocks.sort(compareBlocks);
  const daysWithBlocks = days.map((day) => ({
    ...day,
    blocks: orderedBlocks.filter((block) => toDateKey(new Date(block.start_at)) === day.date_key),
  }));

  return {
    horizon_start: horizonStart.toISOString(),
    horizon_end: horizonEnd.toISOString(),
    days: daysWithBlocks,
    blocks: orderedBlocks,
    unscheduled_tasks: unscheduledTasks,
    summary: {
      scheduled_count: orderedBlocks.filter((block) => block.source !== "locked").length,
      unscheduled_count: unscheduledTasks.length,
      total_minutes: orderedBlocks.reduce((total, block) => total + Number(block.duration_minutes || 0), 0),
      preferences: mergedPreferences,
    },
  };
}

function placeSplittableTask({
  task,
  usableSlotsByDay,
  minutesByDay,
  scheduledBlocks,
  placedBlocks,
  remainingMinutes,
  preferences,
}) {
  for (const day of usableSlotsByDay) {
    for (const groupName of ["preferred", "overflow"]) {
      if (groupName === "overflow" && !preferences.overflow_allowed) {
        continue;
      }

      for (const slot of day[groupName]) {
        while (remainingMinutes > 0 && canUseSlotForTask(slot, task.deadline)) {
          const availableMinutes = Math.min(
            getAvailableMinutesBeforeDeadline(slot, task.deadline),
            getRemainingDailyCapacity(minutesByDay, day.date_key, preferences)
          );

          if (availableMinutes < MIN_SPLIT_MINUTES) {
            break;
          }

          const blockMinutes = Math.min(
            remainingMinutes,
            availableMinutes,
            getPreferredChunkMinutes(task.duration_minutes)
          );

          if (blockMinutes <= 0) {
            break;
          }

          const end = addMinutes(slot.start, blockMinutes);
          const scheduledBlock = makeScheduledBlock(task, slot.start, end, blockMinutes);
          scheduledBlocks.push(scheduledBlock);
          placedBlocks.push(scheduledBlock);
          consumeSlot(slot, end, preferences.buffer_minutes);
          minutesByDay[day.date_key] = (minutesByDay[day.date_key] || 0) + blockMinutes;
          remainingMinutes -= blockMinutes;
        }
      }
    }
  }

  return remainingMinutes;
}

function findSingleBlock({ task, usableSlotsByDay, minutesByDay, preferences }) {
  for (const day of usableSlotsByDay) {
    for (const groupName of ["preferred", "overflow"]) {
      if (groupName === "overflow" && !preferences.overflow_allowed) {
        continue;
      }

      for (const slot of day[groupName]) {
        if (!canUseSlotForTask(slot, task.deadline)) {
          continue;
        }

        const availableMinutes = getAvailableMinutesBeforeDeadline(slot, task.deadline);
        const remainingCapacity = getRemainingDailyCapacity(minutesByDay, day.date_key, preferences);

        if (availableMinutes >= task.duration_minutes && remainingCapacity >= task.duration_minutes) {
          return { day, dateKey: day.date_key, slot };
        }
      }
    }
  }

  return null;
}

function buildUsableSlots(days, rules, tasks, lockedBlocks, preferences) {
  return days.map((day) => {
    const dayStart = startOfDate(day.date);
    const dayEnd = addDays(dayStart, 1);
    let slots = [{ start: dayStart, end: dayEnd }];

    for (const rule of rules.filter((item) => appliesToDate(item, day.date))) {
      if (HARD_RULE_KINDS.has(rule.kind)) {
        for (const block of ruleToBlocks(rule, day.date)) {
          slots = subtractBlockFromSlots(slots, block.start, block.end);
        }
      }
    }

    for (const task of getFixedTasks(tasks, dayStart, dayEnd)) {
      slots = subtractBlockFromSlots(slots, new Date(task.fixed_start), new Date(task.fixed_end));
    }

    for (const block of lockedBlocks.filter((item) => isSameDate(new Date(item.start_at), day.date))) {
      slots = subtractBlockFromSlots(slots, new Date(block.start_at), new Date(block.end_at));
    }

    const preferredWindows = getPreferredWindows(day.date, rules, preferences);
    const preferred = [];
    let overflow = slots.map(cloneSlot);

    for (const slot of slots) {
      for (const window of preferredWindows) {
        const intersection = intersectSlots(slot, window);
        if (intersection) {
          preferred.push(intersection);
        }
      }
    }

    for (const window of preferredWindows) {
      overflow = subtractBlockFromSlots(overflow, window.start, window.end);
    }

    return {
      ...day,
      preferred: preferred.filter(hasUsableDuration),
      overflow: overflow.filter(hasUsableDuration),
    };
  });
}

function getPreferredWindows(date, rules, preferences) {
  const preferredRules = rules.filter(
    (rule) => rule.kind === "preferred" && appliesToDate(rule, date)
  );

  if (preferredRules.length) {
    return preferredRules.flatMap((rule) => ruleToBlocks(rule, date));
  }

  return [
    {
      start: combineDateAndTime(date, preferences.preferred_start_time),
      end: combineDateAndTime(date, preferences.preferred_end_time),
    },
  ];
}

function sortTasksForScheduling(tasks) {
  return [...tasks].sort((a, b) => {
    const deadlineDiff = getDeadlineValue(a) - getDeadlineValue(b);

    if (deadlineDiff !== 0) {
      return deadlineDiff;
    }

    const asapDiff = Number(Boolean(b.asap)) - Number(Boolean(a.asap));

    if (asapDiff !== 0) {
      return asapDiff;
    }

    const priorityDiff = getPriorityScore(b.priority) - getPriorityScore(a.priority);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });
}

function getFlexibleTasks(tasks) {
  return tasks.filter(
    (task) => task.status !== "complete" && !(task.fixed_start && task.fixed_end)
  );
}

function getFixedTasks(tasks, start, end) {
  return tasks.filter((task) => {
    if (!task.fixed_start || !task.fixed_end || task.status === "complete") {
      return false;
    }

    const fixedStart = new Date(task.fixed_start);
    return fixedStart >= start && fixedStart < end;
  });
}

function makeScheduledBlock(task, start, end, durationMinutes) {
  return {
    task_id: task.id,
    title: task.title,
    start_at: new Date(start).toISOString(),
    end_at: new Date(end).toISOString(),
    duration_minutes: durationMinutes,
    status: "scheduled",
    source: "generated",
  };
}

function taskToFixedBlock(task) {
  return {
    task_id: task.id,
    title: task.title,
    start_at: new Date(task.fixed_start).toISOString(),
    end_at: new Date(task.fixed_end).toISOString(),
    duration_minutes: getMinutesBetween(new Date(task.fixed_start), new Date(task.fixed_end)),
    status: "scheduled",
    source: "fixed",
  };
}

function normalizeLockedBlocks(blocks) {
  return blocks.map((block) => ({
    task_id: block.task_id,
    title: block.title,
    start_at: new Date(block.start_at).toISOString(),
    end_at: new Date(block.end_at).toISOString(),
    duration_minutes: block.duration_minutes,
    status: block.status || "scheduled",
    source: block.source || "locked",
  }));
}

function getLockedMinutesByDay(blocks) {
  return blocks.reduce((result, block) => {
    const dateKey = toDateKey(new Date(block.start_at));
    result[dateKey] = (result[dateKey] || 0) + Number(block.duration_minutes || 0);
    return result;
  }, {});
}

function getUnscheduledReason(task, remainingMinutes, placedBlocks) {
  if (task.deadline && new Date(task.deadline) <= new Date()) {
    return "Deadline has passed.";
  }

  if (placedBlocks.length) {
    return `${task.duration_minutes - remainingMinutes} minutes fit, ${remainingMinutes} minutes still need time.`;
  }

  if (!task.splittable) {
    return "No available block was long enough inside your schedule preferences.";
  }

  return "Not enough open time remains in the schedule window.";
}

function normalizePreferences(preferences) {
  return {
    ...DEFAULT_PREFERENCES,
    ...Object.fromEntries(
      Object.entries(preferences || {}).filter(([, value]) => value !== null && value !== undefined)
    ),
  };
}

function buildDays(startDate, count) {
  const firstDay = startOfDate(new Date(startDate));
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(firstDay, index);

    return {
      date,
      date_key: toDateKey(date),
      label: date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }),
    };
  });
}

function ruleToBlocks(rule, date) {
  const start = combineDateAndTime(date, rule.start_time);
  const end = combineDateAndTime(date, rule.end_time);

  if (end > start) {
    return [{ start, end }];
  }

  if (rule.day_of_week === date.getDay()) {
    return [{ start, end: addDays(startOfDate(date), 1) }];
  }

  return [{ start: startOfDate(date), end }];
}

function appliesToDate(rule, date) {
  if (rule.day_of_week === date.getDay()) {
    return true;
  }

  const previousDay = (date.getDay() + 6) % 7;
  return rule.day_of_week === previousDay && String(rule.start_time) > String(rule.end_time);
}

function subtractBlockFromSlots(slots, blockStart, blockEnd) {
  const nextSlots = [];

  for (const slot of slots) {
    if (blockEnd <= slot.start || blockStart >= slot.end) {
      nextSlots.push(slot);
      continue;
    }

    if (blockStart > slot.start) {
      nextSlots.push({ start: slot.start, end: new Date(blockStart) });
    }

    if (blockEnd < slot.end) {
      nextSlots.push({ start: new Date(blockEnd), end: slot.end });
    }
  }

  return nextSlots.filter(hasUsableDuration);
}

function intersectSlots(a, b) {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return start < end ? { start: new Date(start), end: new Date(end) } : null;
}

function hasUsableDuration(slot) {
  return getMinutesBetween(slot.start, slot.end) >= MIN_SPLIT_MINUTES;
}

function canUseSlotForTask(slot, deadline) {
  return !deadline || slot.start < new Date(deadline);
}

function getAvailableMinutesBeforeDeadline(slot, deadline) {
  const slotEnd = deadline && new Date(deadline) < slot.end ? new Date(deadline) : slot.end;
  return Math.max(0, getMinutesBetween(slot.start, slotEnd));
}

function getRemainingDailyCapacity(minutesByDay, dateKey, preferences) {
  return Math.max(0, preferences.max_work_minutes_per_day - (minutesByDay[dateKey] || 0));
}

function consumeSlot(slot, end, bufferMinutes) {
  slot.start = addMinutes(end, bufferMinutes);
}

function getPreferredChunkMinutes(durationMinutes) {
  if (durationMinutes >= 180) {
    return 90;
  }

  if (durationMinutes >= 120) {
    return 60;
  }

  return durationMinutes;
}

function getDeadlineValue(task) {
  return task.deadline ? new Date(task.deadline).getTime() : Number.MAX_SAFE_INTEGER;
}

function getPriorityScore(priority) {
  return { low: 1, medium: 2, high: 3 }[priority] || 2;
}

function addTaskBlock(map, taskId, block) {
  map.set(taskId, [...(map.get(taskId) || []), block]);
}

function compareBlocks(a, b) {
  return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
}

function cloneSlot(slot) {
  return { start: new Date(slot.start), end: new Date(slot.end) };
}

function combineDateAndTime(date, timeValue) {
  const [hours, minutes] = String(timeValue).split(":");
  const result = new Date(date);
  result.setHours(Number(hours), Number(minutes), 0, 0);
  return result;
}

function startOfDate(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfMinute(date) {
  const result = new Date(date);
  result.setSeconds(0, 0);
  return result;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function getMinutesBetween(start, end) {
  return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDate(a, b) {
  return toDateKey(a) === toDateKey(b);
}
