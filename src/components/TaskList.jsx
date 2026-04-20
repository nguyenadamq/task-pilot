function TaskList({ tasks, onEdit, onDelete, isDeletingId }) {
  if (!tasks.length) {
    return <div className="empty-state">No tasks yet. Add your first task to get started.</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div className="task-item" key={task.id}>
          <h3>{task.title}</h3>
          {task.description ? <p>{task.description}</p> : null}

          <div className="task-meta">
            <span>Duration: {task.duration_minutes} min</span>
            <span>Priority: {formatLabel(task.priority)}</span>
            <span>Status: {formatLabel(task.status)}</span>
            <span>Splittable: {task.splittable ? "Yes" : "No"}</span>
            <span>Deadline: {formatDate(task.deadline)}</span>
            <span>
              Fixed time:{" "}
              {task.fixed_start && task.fixed_end
                ? `${formatDate(task.fixed_start)} - ${formatShortTime(task.fixed_end)}`
                : "Not set"}
            </span>
          </div>

          <div className="button-row">
            <button className="button-secondary" type="button" onClick={() => onEdit(task)}>
              Edit
            </button>
            <button
              className="button-danger"
              type="button"
              onClick={() => onDelete(task.id)}
              disabled={isDeletingId === task.id}
            >
              {isDeletingId === task.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatLabel(value) {
  return value.replace("_", " ");
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString();
}

function formatShortTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default TaskList;
