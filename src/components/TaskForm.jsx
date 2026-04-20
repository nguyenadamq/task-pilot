import { useEffect, useState } from "react";

const emptyForm = {
  title: "",
  description: "",
  duration_minutes: 60,
  deadline: "",
  priority: "medium",
  fixed_start: "",
  fixed_end: "",
  status: "todo",
  splittable: false,
};

function TaskForm({ currentTask, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (currentTask) {
      setFormData({
        title: currentTask.title || "",
        description: currentTask.description || "",
        duration_minutes: currentTask.duration_minutes || 60,
        deadline: formatDateTimeValue(currentTask.deadline),
        priority: currentTask.priority || "medium",
        fixed_start: formatDateTimeValue(currentTask.fixed_start),
        fixed_end: formatDateTimeValue(currentTask.fixed_end),
        status: currentTask.status || "todo",
        splittable: currentTask.splittable || false,
      });
      setErrorMessage("");
      return;
    }

    setFormData(emptyForm);
    setErrorMessage("");
  }, [currentTask]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    if (Number(formData.duration_minutes) <= 0) {
      setErrorMessage("Duration must be more than 0.");
      return;
    }

    if ((formData.fixed_start && !formData.fixed_end) || (!formData.fixed_start && formData.fixed_end)) {
      setErrorMessage("Fixed start and fixed end need to be filled in together.");
      return;
    }

    if (
      formData.fixed_start &&
      formData.fixed_end &&
      new Date(formData.fixed_start).getTime() >= new Date(formData.fixed_end).getTime()
    ) {
      setErrorMessage("Fixed end must be after fixed start.");
      return;
    }

    setErrorMessage("");

    const cleanedData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      duration_minutes: Number(formData.duration_minutes),
      deadline: formData.deadline || null,
      priority: formData.priority,
      fixed_start: formData.fixed_start || null,
      fixed_end: formData.fixed_end || null,
      status: formData.status,
      splittable: formData.splittable,
    };

    await onSave(cleanedData);

    if (!currentTask) {
      setFormData(emptyForm);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="task-title">Title</label>
        <input
          id="task-title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <label htmlFor="task-duration">Duration (minutes)</label>
        <input
          id="task-duration"
          name="duration_minutes"
          type="number"
          min="1"
          value={formData.duration_minutes}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="task-deadline">Deadline</label>
        <input
          id="task-deadline"
          name="deadline"
          type="datetime-local"
          value={formData.deadline}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <label htmlFor="task-priority">Priority</label>
        <select
          id="task-priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="task-status">Status</label>
        <select
          id="task-status"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="task-fixed-start">Fixed start</label>
        <input
          id="task-fixed-start"
          name="fixed_start"
          type="datetime-local"
          value={formData.fixed_start}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <label htmlFor="task-fixed-end">Fixed end</label>
        <input
          id="task-fixed-end"
          name="fixed_end"
          type="datetime-local"
          value={formData.fixed_end}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <label>
          <input
            type="checkbox"
            name="splittable"
            checked={formData.splittable}
            onChange={handleChange}
          />{" "}
          Task can be split into smaller pieces
        </label>
      </div>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <div className="button-row">
        <button className="button-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : currentTask ? "Update task" : "Add task"}
        </button>
        {currentTask ? (
          <button className="button-secondary" type="button" onClick={onCancel}>
            Cancel edit
          </button>
        ) : null}
      </div>
    </form>
  );
}

function formatDateTimeValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default TaskForm;
