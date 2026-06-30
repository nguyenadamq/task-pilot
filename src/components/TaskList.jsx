function TaskList({ tasks, onEdit, onDelete, onComplete, isSaving }) {
  if (!tasks.length) {
    return <div className="empty-state">No tasks yet.</div>;
  }

  return (
    <div className="list-stack">
      {tasks.map((task) => (
        <article className="list-item" key={task.id}>
          <div>
            <h3>{task.title}</h3>
            {task.description ? <p>{task.description}</p> : null}
            <div className="tag-row">
              <span className="tag">{task.priority}</span>
              <span className="tag">{formatStatus(task.status)}</span>
              {task.asap ? <span className="tag">ASAP</span> : null}
              {task.splittable ? <span className="tag">splittable</span> : null}
            </div>
            <p className="meta-line">
              {task.duration_minutes} min
              {task.deadline ? ` | due ${formatDate(task.deadline)}` : " | no deadline"}
            </p>
          </div>
          <div className="button-row">
            {task.status !== "complete" ? (
              <button className="secondary-button" type="button" onClick={() => onComplete(task.id)} disabled={isSaving}>
                Complete
              </button>
            ) : null}
            <button className="secondary-button" type="button" onClick={() => onEdit(task)}>
              Edit
            </button>
            <button className="danger-button" type="button" onClick={() => onDelete(task.id)} disabled={isSaving}>
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatStatus(status) {
  return String(status).replace("_", " ");
}

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default TaskList;
