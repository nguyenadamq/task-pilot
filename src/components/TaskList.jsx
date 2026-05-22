import { useState } from "react";

function TaskList({ tasks, onEdit, onDelete, isDeletingId }) {
  const [filter, setFilter] = useState("active");
  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "overdue") {
      return isOverdue(task);
    }

    if (filter === "done") {
      return task.status === "done";
    }

    return task.status !== "done";
  });

  if (!tasks.length) {
    return <div className="empty-state">No tasks yet. Add your first task to get started.</div>;
  }

  return (
    <div className="task-list">
      <div className="filter-row">
        <button
          className={filter === "active" ? "filter-button active" : "filter-button"}
          type="button"
          onClick={() => setFilter("active")}
        >
          Open
        </button>
        <button
          className={filter === "overdue" ? "filter-button active" : "filter-button"}
          type="button"
          onClick={() => setFilter("overdue")}
        >
          Overdue
        </button>
        <button
          className={filter === "done" ? "filter-button active" : "filter-button"}
          type="button"
          onClick={() => setFilter("done")}
        >
          Done
        </button>
        <button
          className={filter === "all" ? "filter-button active" : "filter-button"}
          type="button"
          onClick={() => setFilter("all")}
        >
          All
        </button>
      </div>

      {!filteredTasks.length ? <div className="empty-state">No tasks match this view.</div> : null}

      {filteredTasks.map((task) => (
        <div className={`task-item ${isOverdue(task) ? "task-item-overdue" : ""}`} key={task.id}>
          <h3>{task.title}</h3>
          {task.description ? <p>{task.description}</p> : null}

          <div className="task-tags">
            <span className={`tag tag-${task.priority}`}>{formatLabel(task.priority)}</span>
            <span className={`tag tag-status tag-${task.status}`}>{formatLabel(task.status)}</span>
            {isOverdue(task) ? <span className="tag tag-overdue">overdue</span> : null}
          </div>

          <div className="task-meta">
            <span>Duration: {task.duration_minutes} min</span>
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

function isOverdue(task) {
  if (!task.deadline || task.status === "done") {
    return false;
  }

  return new Date(task.deadline) < new Date();
}

export default TaskList;
