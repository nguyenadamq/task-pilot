function SchedulePreview({ plan, title }) {
  if (!plan) {
    return <div className="empty-state">Add availability, then generate a schedule for the next 7 days.</div>;
  }

  return (
    <div className="schedule-preview">
      {title ? <h3>{title}</h3> : null}

      <div className="card">
        <h3>Schedule Summary</h3>
        <p className="helper-text">
          Chosen strategy: {plan.summary.strategyLabel} | Score: {plan.summary.score} | Candidates
          tried: {plan.summary.candidateCount}
        </p>

        {plan.repairInfo ? (
          <p className="helper-text">
            Repair tasks: {plan.repairInfo.repairTaskCount} | Locked future blocks:{" "}
            {plan.repairInfo.lockedCount} | Overdue: {plan.repairInfo.repairReasons.overdueCount} |
            In progress: {plan.repairInfo.repairReasons.incompleteCount} | Missed blocks:{" "}
            {plan.repairInfo.repairReasons.missedBlockCount}
          </p>
        ) : null}

        <div className="simple-list">
          {plan.candidates.map((candidate) => (
            <div className="list-row" key={candidate.strategyKey}>
              <span>{candidate.strategyLabel}</span>
              <span className="helper-text">
                Score {candidate.score} | Unscheduled {candidate.unscheduledCount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {plan.comparison ? (
        <div className="card">
          <h3>Repair Changes</h3>
          <p className="helper-text">
            Kept: {plan.comparison.keptCount} | Moved: {plan.comparison.movedCount} | Added:{" "}
            {plan.comparison.addedCount} | Removed: {plan.comparison.removedCount}
          </p>

          <div className="simple-list">
            {plan.comparison.moved.map((item, index) => (
              <div className="list-row" key={`moved-${index}`}>
                <span>{item.title}</span>
                <span className="helper-text">
                  Moved from {formatDateTime(item.from)} to {formatDateTime(item.to)}
                </span>
              </div>
            ))}

            {plan.comparison.added.map((item) => (
              <div className="list-row" key={`added-${item.taskId}-${item.start}`}>
                <span>{item.title}</span>
                <span className="helper-text">Added at {formatDateTime(item.start)}</span>
              </div>
            ))}

            {plan.comparison.removed.map((item) => (
              <div className="list-row" key={`removed-${item.taskId}-${item.start}`}>
                <span>{item.title}</span>
                <span className="helper-text">Removed from {formatDateTime(item.start)}</span>
              </div>
            ))}

            {!plan.comparison.moved.length &&
            !plan.comparison.added.length &&
            !plan.comparison.removed.length ? (
              <p className="helper-text">The repaired version kept the future schedule mostly the same.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="schedule-grid">
        {plan.days.map((day) => (
          <div className="schedule-day" key={day.dateKey}>
            <h3>{day.label}</h3>
            {day.items.length ? (
              day.items.map((item) => (
                <div className="schedule-entry" key={`${item.taskId}-${item.start}`}>
                  <strong>{item.title}</strong>
                  <div className="helper-text">
                    {formatDateTime(item.start)} - {formatTime(item.end)}
                  </div>
                  <div className="helper-text">{item.durationMinutes} minutes</div>
                </div>
              ))
            ) : (
              <p className="helper-text">No task blocks placed.</p>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Unscheduled Tasks</h3>
        {plan.unscheduledTasks.length ? (
          <div className="simple-list">
            {plan.unscheduledTasks.map((task) => (
              <div className="list-row" key={task.id}>
                <span>{task.title}</span>
                <span className="helper-text">{task.remainingMinutes} minutes left</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="helper-text">Everything fit into the current weekly schedule.</p>
        )}
      </div>
    </div>
  );
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default SchedulePreview;
