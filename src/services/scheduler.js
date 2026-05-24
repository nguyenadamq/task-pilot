const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_WORK_MINUTES_PER_DAY = 360;
const MIN_SPLIT_MINUTES = 30;

const STRATEGIES = [
  {
    key: "deadline-first",
    label: "Deadline first",
    sortTasks(tasks) {
      return [...tasks].sort((a, b) => {
        const deadlineDiff = getDeadlineValue(a) - getDeadlineValue(b);

        if (deadlineDiff !== 0) {
          return deadlineDiff;
        }

        const priorityDiff = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
  },
  {
    key: "priority-first",
    label: "Priority first",
    sortTasks(tasks) {
      return [...tasks].sort((a, b) => {
        const priorityDiff = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        const deadlineDiff = getDeadlineValue(a) - getDeadlineValue(b);

        if (deadlineDiff !== 0) {
          return deadlineDiff;
        }

        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
  },
  {
    key: "larger-tasks-first",
    label: "Larger tasks first",
    sortTasks(tasks) {
      return [...tasks].sort((a, b) => {
        const durationDiff = b.duration_minutes - a.duration_minutes;

        if (durationDiff !== 0) {
          return durationDiff;
        }

        const deadlineDiff = getDeadlineValue(a) - getDeadlineValue(b);

        if (deadlineDiff !== 0) {
          return deadlineDiff;
        }

        return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      });
    },
  },
  {
    key: "balanced",
    label: "Balanced mix",
    sortTasks(tasks) {
      return [...tasks].sort((a, b) => {
        const scoreA = getTaskUrgencyScore(a);
        const scoreB = getTaskUrgencyScore(b);

        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }

        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
  },
];

export function generateWeeklySchedule({ tasks, sleepRules, fixedEvents }) {
  return buildBestSchedule({
    tasks,
    sleepRules,
    fixedEvents,
    lockedItems: [],
    startDate: startOfToday(),
    mode: "original",
  });
}

export function repairWeeklySchedule({ originalPlan, tasks, sleepRules, fixedEvents }) {
  if (!originalPlan) {
    return generateWeeklySchedule({ tasks, sleepRules, fixedEvents });
  }

  const now = new Date();
  const tasksById = Object.fromEntries(tasks.map((task) => [task.id, task]));
  const originalScheduledItems = originalPlan.scheduledItems || [];
  const repairTaskIds = getRepairTaskIds(tasks, originalPlan, now);

  const lockedItems = originalScheduledItems.filter((item) => {
    const task = tasksById[item.taskId];

    if (!task) {
      return false;
    }

    if (repairTaskIds.has(item.taskId)) {
      return false;
    }

    if (new Date(item.start) < now) {
      return false;
    }

    return task.status !== "done";
  });

  const repairTasks = tasks
    .filter((task) => repairTaskIds.has(task.id))
    .map((task) => ({
      ...task,
      duration_minutes: getRemainingMinutesForRepair(task, originalPlan, now),
    }))
    .filter((task) => task.status !== "done" && task.duration_minutes > 0);

  const repairedPlan = buildBestSchedule({
    tasks: repairTasks,
    sleepRules,
    fixedEvents,
    lockedItems,
    startDate: startOfToday(),
    mode: "repair",
  });

  const comparison = compareSchedules(originalScheduledItems, repairedPlan.scheduledItems, now);
  const repairReasons = getRepairReasonSummary(tasks, originalPlan, now);

  return {
    ...repairedPlan,
    repairInfo: {
      lockedCount: lockedItems.length,
      repairTaskCount: repairTasks.length,
      repairReasons,
    },
    comparison,
  };
}

function buildBestSchedule({ tasks, sleepRules, fixedEvents, lockedItems, startDate, mode }) {
  const candidates = STRATEGIES.map((strategy) =>
    buildCandidateSchedule({
      strategy,
      startDate,
      tasks,
      sleepRules,
      fixedEvents,
      lockedItems,
    })
  );

  const bestCandidate = [...candidates].sort((a, b) => b.score - a.score)[0];

  return {
    days: bestCandidate.days,
    scheduledItems: bestCandidate.scheduledItems,
    unscheduledTasks: bestCandidate.unscheduledTasks,
    summary: {
      strategyKey: bestCandidate.strategy.key,
      strategyLabel: bestCandidate.strategy.label,
      score: bestCandidate.score,
      candidateCount: candidates.length,
      mode,
    },
    candidates: [...candidates]
      .sort((a, b) => b.score - a.score)
      .map((candidate) => ({
        strategyKey: candidate.strategy.key,
        strategyLabel: candidate.strategy.label,
        score: candidate.score,
        unscheduledCount: candidate.unscheduledTasks.length,
      })),
  };
}

function buildCandidateSchedule({
  strategy,
  startDate,
  tasks,
  sleepRules,
  fixedEvents,
  lockedItems,
}) {
  const days = buildDays(startDate, 7, sleepRules, fixedEvents, tasks, lockedItems);
  const flexibleTasks = strategy.sortTasks(getFlexibleTasks(tasks));
  const scheduledItems = [];
  const unscheduledTasks = [];
  const minutesByDay = {};
  const taskBlocksById = {};

  applyLockedItems(scheduledItems, taskBlocksById, minutesByDay, lockedItems);

  for (const task of flexibleTasks) {
    let remainingMinutes = task.duration_minutes;
    const placedBlocks = [];

    if (task.splittable) {
      remainingMinutes = placeSplittableTask({
        task,
        days,
        minutesByDay,
        scheduledItems,
        placedBlocks,
        remainingMinutes,
      });
    } else {
      const singleBlock = findSingleBlock(days, task, minutesByDay);

      if (singleBlock) {
        const end = addMinutes(singleBlock.start, task.duration_minutes);

        scheduledItems.push({
          taskId: task.id,
          title: task.title,
          start: singleBlock.start.toISOString(),
          end: end.toISOString(),
          durationMinutes: task.duration_minutes,
        });

        placedBlocks.push({
          start: singleBlock.start,
          end,
          durationMinutes: task.duration_minutes,
        });

        singleBlock.slot.start = end;
        minutesByDay[singleBlock.dateKey] =
          (minutesByDay[singleBlock.dateKey] || 0) + task.duration_minutes;
        remainingMinutes = 0;
      }
    }

    if (remainingMinutes > 0) {
      unscheduledTasks.push({
        id: task.id,
        title: task.title,
        remainingMinutes,
        priority: task.priority,
        duration_minutes: task.duration_minutes,
      });
    }

    taskBlocksById[task.id] = [...(taskBlocksById[task.id] || []), ...placedBlocks];
  }

  const mappedDays = days.map((day) => ({
    dateKey: day.dateKey,
    label: day.label,
    items: scheduledItems
      .filter((item) => item.start.slice(0, 10) === day.dateKey)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
  }));

  const score = scoreSchedule({
    tasks: flexibleTasks,
    unscheduledTasks,
    taskBlocksById,
    startDate,
  });

  return {
    strategy,
    days: mappedDays,
    scheduledItems: [...scheduledItems].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    ),
    unscheduledTasks,
    score,
  };
}

function applyLockedItems(scheduledItems, taskBlocksById, minutesByDay, lockedItems) {
  for (const item of lockedItems) {
    scheduledItems.push(item);

    if (!taskBlocksById[item.taskId]) {
      taskBlocksById[item.taskId] = [];
    }

    taskBlocksById[item.taskId].push({
      start: new Date(item.start),
      end: new Date(item.end),
      durationMinutes: item.durationMinutes,
    });

    const dateKey = item.start.slice(0, 10);
    minutesByDay[dateKey] = (minutesByDay[dateKey] || 0) + item.durationMinutes;
  }
}

function placeSplittableTask({
  task,
  days,
  minutesByDay,
  scheduledItems,
  placedBlocks,
  remainingMinutes,
}) {
  for (const day of days) {
    for (const slot of day.slots) {
      if (remainingMinutes <= 0) {
        break;
      }

      if (!canUseSlotForTask(slot, task.deadline)) {
        continue;
      }

      const availableBeforeDeadline = getAvailableMinutesBeforeDeadline(slot, task.deadline);
      const availableMinutes = Math.min(
        getMinutesBetween(slot.start, slot.end),
        availableBeforeDeadline,
        getRemainingDailyCapacity(minutesByDay, day.dateKey)
      );

      if (availableMinutes < MIN_SPLIT_MINUTES) {
        continue;
      }

      const blockMinutes = chooseSplitBlockMinutes(task, remainingMinutes, availableMinutes);
      const end = addMinutes(slot.start, blockMinutes);

      scheduledItems.push({
        taskId: task.id,
        title: task.title,
        start: slot.start.toISOString(),
        end: end.toISOString(),
        durationMinutes: blockMinutes,
      });

      placedBlocks.push({
        start: new Date(slot.start),
        end,
        durationMinutes: blockMinutes,
      });

      slot.start = end;
      minutesByDay[day.dateKey] = (minutesByDay[day.dateKey] || 0) + blockMinutes;
      remainingMinutes -= blockMinutes;
    }
  }

  return remainingMinutes;
}

function buildDays(startDate, numberOfDays, sleepRules, fixedEvents, tasks, lockedItems = []) {
  const days = [];

  for (let index = 0; index < numberOfDays; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const dateKey = toDateKey(date);
    const label = `${DAY_LABELS[date.getDay()]} ${date.toLocaleDateString()}`;
    const fixedEventsForDay = fixedEvents.filter((event) => event.day_of_week === date.getDay());
    let slots = [
      {
        start: startOfDate(date),
        end: endOfDate(date),
      },
    ];

    const sleepBlocksForDay = getSleepBlocksForDate(date, sleepRules);

    for (const sleepBlock of sleepBlocksForDay) {
      slots = subtractBlockFromSlots(slots, sleepBlock.start, sleepBlock.end);
    }

    for (const fixedEvent of fixedEventsForDay) {
      const blockStart = combineDateAndTime(date, fixedEvent.start_time);
      const blockEnd = combineDateAndTime(date, fixedEvent.end_time);
      slots = subtractBlockFromSlots(slots, blockStart, blockEnd);
    }

    const fixedTasksForDay = tasks.filter((task) => {
      if (!task.fixed_start || !task.fixed_end) {
        return false;
      }

      return toDateKey(new Date(task.fixed_start)) === dateKey;
    });

    for (const fixedTask of fixedTasksForDay) {
      slots = subtractBlockFromSlots(
        slots,
        new Date(fixedTask.fixed_start),
        new Date(fixedTask.fixed_end)
      );
    }

    const lockedItemsForDay = lockedItems.filter((item) => item.start.slice(0, 10) === dateKey);

    for (const lockedItem of lockedItemsForDay) {
      slots = subtractBlockFromSlots(slots, new Date(lockedItem.start), new Date(lockedItem.end));
    }

    days.push({ dateKey, label, slots });
  }

  return days;
}

function getSleepBlocksForDate(date, sleepRules) {
  const blocks = [];
  const currentDay = date.getDay();
  const previousDay = (currentDay + 6) % 7;

  for (const rule of sleepRules) {
    if (rule.day_of_week === currentDay) {
      if (rule.start_time < rule.end_time) {
        blocks.push({
          start: combineDateAndTime(date, rule.start_time),
          end: combineDateAndTime(date, rule.end_time),
        });
      } else {
        blocks.push({
          start: combineDateAndTime(date, rule.start_time),
          end: endOfDate(date),
        });
      }
    }

    if (rule.day_of_week === previousDay && rule.start_time > rule.end_time) {
      blocks.push({
        start: startOfDate(date),
        end: combineDateAndTime(date, rule.end_time),
      });
    }
  }

  return blocks;
}

function getFlexibleTasks(tasks) {
  return tasks.filter((task) => task.status !== "done" && !(task.fixed_start && task.fixed_end));
}

function findSingleBlock(days, task, minutesByDay) {
  for (const day of days) {
    for (const slot of day.slots) {
      if (!canUseSlotForTask(slot, task.deadline)) {
        continue;
      }

      const slotMinutes = Math.min(
        getMinutesBetween(slot.start, slot.end),
        getAvailableMinutesBeforeDeadline(slot, task.deadline)
      );
      const remainingCapacity = getRemainingDailyCapacity(minutesByDay, day.dateKey);

      if (slotMinutes >= task.duration_minutes && remainingCapacity >= task.duration_minutes) {
        return {
          slot,
          start: new Date(slot.start),
          dateKey: day.dateKey,
        };
      }
    }
  }

  return null;
}

function scoreSchedule({ tasks, unscheduledTasks, taskBlocksById, startDate }) {
  let score = 0;

  for (const task of tasks) {
    const taskBlocks = taskBlocksById[task.id] || [];
    const taskMinutesScheduled = taskBlocks.reduce((total, block) => total + block.durationMinutes, 0);
    const taskPriorityWeight = getPriorityScore(task.priority);
    const fullyScheduled = taskMinutesScheduled >= task.duration_minutes;

    if (fullyScheduled) {
      score += 60 + taskPriorityWeight * 12;
    } else if (taskMinutesScheduled > 0) {
      score += 20 + taskPriorityWeight * 5;
    }

    if (taskBlocks.length > 0) {
      const firstBlock = taskBlocks[0];
      const daysFromStart = getDaysBetween(startDate, firstBlock.start);
      score += Math.max(0, 12 - daysFromStart) * taskPriorityWeight;

      if (task.deadline) {
        const deadline = new Date(task.deadline);

        if (new Date(firstBlock.end) <= deadline) {
          score += 20;
        } else {
          score -= 40;
        }
      }

      if (task.duration_minutes >= 180 && daysFromStart <= 2) {
        score += 15;
      }

      if (task.splittable && task.duration_minutes >= 120) {
        if (taskBlocks.length >= 2 && taskBlocks.length <= 4) {
          score += 12;
        }

        if (taskBlocks.some((block) => block.durationMinutes < MIN_SPLIT_MINUTES)) {
          score -= 10;
        }
      }
    }
  }

  for (const task of unscheduledTasks) {
    const priorityPenalty = getPriorityScore(task.priority) * 20;
    const durationPenalty = Math.ceil(task.remainingMinutes / 30) * 2;
    score -= priorityPenalty + durationPenalty;
  }

  score -= Math.max(0, unscheduledTasks.length - 1) * 5;

  return score;
}

function compareSchedules(originalItems, repairedItems, now) {
  const futureOriginalItems = originalItems.filter((item) => new Date(item.start) >= now);
  const originalKeyMap = new Map(futureOriginalItems.map((item) => [getItemKey(item), item]));
  const repairedKeyMap = new Map(repairedItems.map((item) => [getItemKey(item), item]));
  const kept = [];
  const moved = [];
  const added = [];
  const removed = [];

  for (const repairedItem of repairedItems) {
    const exactKey = getItemKey(repairedItem);

    if (originalKeyMap.has(exactKey)) {
      kept.push(repairedItem);
      continue;
    }

    const originalMatch = futureOriginalItems.find((item) => item.taskId === repairedItem.taskId);

    if (originalMatch) {
      moved.push({
        title: repairedItem.title,
        from: originalMatch.start,
        to: repairedItem.start,
      });
    } else {
      added.push(repairedItem);
    }
  }

  for (const originalItem of futureOriginalItems) {
    const exactKey = getItemKey(originalItem);

    if (repairedKeyMap.has(exactKey)) {
      continue;
    }

    const repairedMatch = repairedItems.find((item) => item.taskId === originalItem.taskId);

    if (!repairedMatch) {
      removed.push(originalItem);
    }
  }

  return {
    keptCount: kept.length,
    movedCount: moved.length,
    addedCount: added.length,
    removedCount: removed.length,
    moved,
    removed,
    added,
  };
}

function getRepairTaskIds(tasks, originalPlan, now) {
  const repairTaskIds = new Set();
  const originalScheduledItems = originalPlan.scheduledItems || [];

  for (const task of tasks) {
    if (task.status === "done") {
      continue;
    }

    if (task.deadline && new Date(task.deadline) < now) {
      repairTaskIds.add(task.id);
      continue;
    }

    if (task.status === "in_progress") {
      repairTaskIds.add(task.id);
      continue;
    }

    const taskItems = originalScheduledItems.filter((item) => item.taskId === task.id);

    if (taskItems.some((item) => new Date(item.end) < now)) {
      repairTaskIds.add(task.id);
      continue;
    }
  }

  for (const task of originalPlan.unscheduledTasks || []) {
    repairTaskIds.add(task.id);
  }

  return repairTaskIds;
}

function getRemainingMinutesForRepair(task, originalPlan, now) {
  const taskItems = (originalPlan.scheduledItems || []).filter((item) => item.taskId === task.id);
  const futureMinutes = taskItems
    .filter((item) => new Date(item.start) >= now)
    .reduce((total, item) => total + item.durationMinutes, 0);

  if (task.status === "in_progress" && futureMinutes > 0) {
    return futureMinutes;
  }

  return task.duration_minutes;
}

function getRepairReasonSummary(tasks, originalPlan, now) {
  let overdueCount = 0;
  let incompleteCount = 0;
  let missedBlockCount = 0;

  for (const task of tasks) {
    if (task.status === "done") {
      continue;
    }

    if (task.deadline && new Date(task.deadline) < now) {
      overdueCount += 1;
    }

    if (task.status === "in_progress") {
      incompleteCount += 1;
    }

    const taskItems = (originalPlan.scheduledItems || []).filter((item) => item.taskId === task.id);

    if (taskItems.some((item) => new Date(item.end) < now)) {
      missedBlockCount += 1;
    }
  }

  return {
    overdueCount,
    incompleteCount,
    missedBlockCount,
  };
}

function chooseSplitBlockMinutes(task, remainingMinutes, availableMinutes) {
  const preferredChunk = getPreferredChunkMinutes(task.duration_minutes);
  let blockMinutes = Math.min(remainingMinutes, availableMinutes, preferredChunk);

  if (remainingMinutes - blockMinutes > 0 && remainingMinutes - blockMinutes < MIN_SPLIT_MINUTES) {
    blockMinutes = Math.min(remainingMinutes, availableMinutes);
  }

  return blockMinutes;
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

function subtractBlockFromSlots(slots, blockStart, blockEnd) {
  const nextSlots = [];

  for (const slot of slots) {
    if (blockEnd <= slot.start || blockStart >= slot.end) {
      nextSlots.push(slot);
      continue;
    }

    if (blockStart > slot.start) {
      nextSlots.push({
        start: slot.start,
        end: new Date(blockStart),
      });
    }

    if (blockEnd < slot.end) {
      nextSlots.push({
        start: new Date(blockEnd),
        end: slot.end,
      });
    }
  }

  return nextSlots.filter((slot) => slot.start < slot.end);
}

function canUseSlotForTask(slot, deadline) {
  if (!deadline) {
    return true;
  }

  return slot.start < new Date(deadline);
}

function getAvailableMinutesBeforeDeadline(slot, deadline) {
  if (!deadline) {
    return getMinutesBetween(slot.start, slot.end);
  }

  const deadlineDate = new Date(deadline);

  if (deadlineDate <= slot.start) {
    return 0;
  }

  const effectiveEnd = deadlineDate < slot.end ? deadlineDate : slot.end;
  return getMinutesBetween(slot.start, effectiveEnd);
}

function getRemainingDailyCapacity(minutesByDay, dateKey) {
  return MAX_WORK_MINUTES_PER_DAY - (minutesByDay[dateKey] || 0);
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

function endOfDate(date) {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getMinutesBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getPriorityWeight(priority) {
  const weights = { high: 0, medium: 1, low: 2 };
  return weights[priority] ?? 1;
}

function getPriorityScore(priority) {
  const scores = { high: 3, medium: 2, low: 1 };
  return scores[priority] ?? 1;
}

function getDeadlineValue(task) {
  return task.deadline ? new Date(task.deadline).getTime() : Number.MAX_SAFE_INTEGER;
}

function getTaskUrgencyScore(task) {
  const priorityPart = getPriorityScore(task.priority) * 30;
  const durationPart = Math.min(task.duration_minutes, 240) / 15;
  const deadlinePart = task.deadline ? Math.max(0, 14 - getDaysUntilDeadline(task.deadline)) * 4 : 0;

  return priorityPart + deadlinePart + durationPart;
}

function getDaysBetween(start, end) {
  const startCopy = new Date(start);
  const endCopy = new Date(end);
  startCopy.setHours(0, 0, 0, 0);
  endCopy.setHours(0, 0, 0, 0);
  return Math.floor((endCopy.getTime() - startCopy.getTime()) / 86400000);
}

function getDaysUntilDeadline(deadline) {
  return getDaysBetween(startOfToday(), new Date(deadline));
}

function getItemKey(item) {
  return `${item.taskId}-${item.start}-${item.end}`;
}
