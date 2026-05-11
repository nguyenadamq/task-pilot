function SchedulePreview({ plan }) {
  if (!plan) {
    return <div className="empty-state">Add availability, then generate a schedule for the next 7 days.</div>;
  }

  return (
    <div className="schedule-preview">
      <div className="card">
        <h3>Schedule Summary</h3>
        <p className="helper-text">
          Chosen strategy: {plan.summary.strategyLabel} | Score: {plan.summary.score} | Candidates
          tried: {plan.summary.candidateCount}
        </p>

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
