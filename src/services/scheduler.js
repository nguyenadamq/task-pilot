const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_WORK_MINUTES_PER_DAY = 360;
const MIN_SPLIT_MINUTES = 30;

export function generateWeeklySchedule({ tasks, availabilityRules, fixedEvents }) {
  const startDate = startOfToday();
  const days = buildDays(startDate, 7, availabilityRules, fixedEvents, tasks);
  const flexibleTasks = sortTasksForScheduling(tasks);
  const scheduledItems = [];
  const unscheduledTasks = [];
  const minutesByDay = {};

  for (const task of flexibleTasks) {
    let remainingMinutes = task.duration_minutes;
    let scheduled = false;

    if (task.splittable) {
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

          const blockMinutes = Math.min(remainingMinutes, availableMinutes);

          scheduledItems.push({
            taskId: task.id,
            title: task.title,
            start: slot.start.toISOString(),
            end: addMinutes(slot.start, blockMinutes).toISOString(),
            durationMinutes: blockMinutes,
          });

          slot.start = addMinutes(slot.start, blockMinutes);
          minutesByDay[day.dateKey] = (minutesByDay[day.dateKey] || 0) + blockMinutes;
          remainingMinutes -= blockMinutes;
          scheduled = true;
        }
      }
    } else {
      const singleBlock = findSingleBlock(days, task, minutesByDay);

      if (singleBlock) {
        scheduledItems.push({
          taskId: task.id,
          title: task.title,
          start: singleBlock.start.toISOString(),
          end: addMinutes(singleBlock.start, task.duration_minutes).toISOString(),
          durationMinutes: task.duration_minutes,
        });

        singleBlock.slot.start = addMinutes(singleBlock.start, task.duration_minutes);
        minutesByDay[singleBlock.dateKey] =
          (minutesByDay[singleBlock.dateKey] || 0) + task.duration_minutes;
        remainingMinutes = 0;
        scheduled = true;
      }
    }

    if (remainingMinutes > 0) {
      unscheduledTasks.push({
        id: task.id,
        title: task.title,
        remainingMinutes,
      });
    } else if (!scheduled) {
      unscheduledTasks.push({
        id: task.id,
        title: task.title,
        remainingMinutes: task.duration_minutes,
      });
    }
  }

  return {
    days: days.map((day) => ({
      dateKey: day.dateKey,
      label: day.label,
      items: scheduledItems.filter((item) => item.start.slice(0, 10) === day.dateKey),
    })),
    unscheduledTasks,
  };
}

function buildDays(startDate, numberOfDays, availabilityRules, fixedEvents, tasks) {
  const days = [];

  for (let index = 0; index < numberOfDays; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const dateKey = toDateKey(date);
    const label = `${DAY_LABELS[date.getDay()]} ${date.toLocaleDateString()}`;
    const availabilityForDay = availabilityRules.filter((rule) => rule.day_of_week === date.getDay());
    const fixedEventsForDay = fixedEvents.filter((event) => event.day_of_week === date.getDay());
    let slots = availabilityForDay.map((rule) => ({
      start: combineDateAndTime(date, rule.start_time),
      end: combineDateAndTime(date, rule.end_time),
    }));

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

    days.push({ dateKey, label, slots });
  }

  return days;
}

function sortTasksForScheduling(tasks) {
  return [...tasks]
    .filter((task) => task.status !== "done" && !(task.fixed_start && task.fixed_end))
    .sort((a, b) => {
      const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;

      if (deadlineA !== deadlineB) {
        return deadlineA - deadlineB;
      }

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityA = priorityOrder[a.priority] ?? 1;
      const priorityB = priorityOrder[b.priority] ?? 1;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}

function findSingleBlock(days, task, minutesByDay) {
  for (const day of days) {
    for (const slot of day.slots) {
      if (!canUseSlotForTask(slot, task.deadline)) {
        continue;
      }

      const slotMinutes = getMinutesBetween(slot.start, slot.end);
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
