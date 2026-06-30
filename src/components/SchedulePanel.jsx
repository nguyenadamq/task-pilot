function SchedulePanel({ schedule, isSaving, onGenerate }) {
  const blocksByDay = groupBlocksByDay(schedule?.blocks || []);
  const unscheduled = schedule?.run?.summary?.unscheduled_tasks || [];
  const calendar = buildCalendar(schedule?.blocks || []);
  const hourHeight = 56;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Generated Schedule</h2>
          {schedule?.run ? <p className="meta-line">Last generated {formatDateTime(schedule.run.created_at)}</p> : null}
        </div>
        <button className="primary-button" type="button" onClick={onGenerate} disabled={isSaving}>
          Generate schedule
        </button>
      </div>

      {!schedule ? <div className="empty-state">Add tasks and availability, then generate your first schedule.</div> : null}

      {schedule ? (
        <div className="calendar-shell">
          <div className="calendar-header" style={{ gridTemplateColumns: `72px repeat(${calendar.days.length}, minmax(150px, 1fr))` }}>
            <div />
            {calendar.days.map((day) => (
              <div className="calendar-day-heading" key={day.key}>
                <strong>{day.weekday}</strong>
                <span>{day.date}</span>
              </div>
            ))}
          </div>

          <div
            className="calendar-grid"
            style={{
              gridTemplateColumns: `72px repeat(${calendar.days.length}, minmax(150px, 1fr))`,
              height: `${calendar.hours.length * hourHeight}px`,
            }}
          >
            <div className="calendar-time-column">
              {calendar.hours.map((hour) => (
                <div className="calendar-hour-label" key={hour}>
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {calendar.days.map((day) => (
              <div className="calendar-day-column" key={day.key}>
                {calendar.hours.map((hour) => (
                  <div className="calendar-hour-line" key={hour} />
                ))}
                {day.blocks.map((block) => (
                  <div
                    className="calendar-event"
                    key={block.id || `${block.task_id}-${block.start_at}`}
                    style={{
                      top: `${block.top}px`,
                      height: `${block.height}px`,
                    }}
                  >
                    <strong>{block.title}</strong>
                    <span>
                      {formatTime(block.start_at)} - {formatTime(block.end_at)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {schedule ? (
        <details className="schedule-list-details">
          <summary>List view</summary>
          <div className="schedule-grid">
            {Object.entries(blocksByDay).map(([day, blocks]) => (
              <div className="schedule-day" key={day}>
                <h3>{day}</h3>
                {blocks.map((block) => (
                  <div className="schedule-block" key={block.id || `${block.task_id}-${block.start_at}`}>
                    <strong>{block.title}</strong>
                    <span>
                      {formatTime(block.start_at)} - {formatTime(block.end_at)}
                    </span>
                    <small>{block.duration_minutes} min</small>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {unscheduled.length ? (
        <div className="unscheduled-box">
          <h3>Unscheduled</h3>
          {unscheduled.map((task) => (
            <p key={task.id}>
              <strong>{task.title}</strong>: {task.reason}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function buildCalendar(blocks) {
  const orderedBlocks = [...blocks].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const dayKeys = [...new Set(orderedBlocks.map((block) => toDateKey(new Date(block.start_at))))];
  const days = dayKeys.map((key) => {
    const date = new Date(`${key}T12:00:00`);
    return {
      key,
      weekday: date.toLocaleDateString([], { weekday: "short" }),
      date: date.toLocaleDateString([], { month: "short", day: "numeric" }),
      blocks: [],
    };
  });

  if (!days.length) {
    return { days: [], hours: [] };
  }

  const earliestHour = Math.max(
    0,
    Math.min(7, ...orderedBlocks.map((block) => new Date(block.start_at).getHours()))
  );
  const latestHour = Math.min(
    24,
    Math.max(22, ...orderedBlocks.map((block) => Math.ceil(minutesFromMidnight(new Date(block.end_at)) / 60)))
  );
  const hours = Array.from({ length: latestHour - earliestHour }, (_, index) => earliestHour + index);
  const pixelsPerMinute = 56 / 60;

  for (const day of days) {
    day.blocks = orderedBlocks
      .filter((block) => toDateKey(new Date(block.start_at)) === day.key)
      .map((block) => {
        const startMinutes = minutesFromMidnight(new Date(block.start_at));
        const endMinutes = minutesFromMidnight(new Date(block.end_at));
        const top = Math.max(0, (startMinutes - earliestHour * 60) * pixelsPerMinute);
        const height = Math.max(32, (endMinutes - startMinutes) * pixelsPerMinute);

        return {
          ...block,
          top,
          height,
        };
      });
  }

  return { days, hours };
}

function groupBlocksByDay(blocks) {
  return blocks.reduce((result, block) => {
    const key = new Date(block.start_at).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    result[key] = [...(result[key] || []), block];
    return result;
  }, {});
}

function minutesFromMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHour(hour) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default SchedulePanel;
