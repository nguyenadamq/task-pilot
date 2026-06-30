import { useEffect, useState } from "react";

const emptyTask = {
  title: "",
  description: "",
  priority: "medium",
  duration_minutes: 60,
  deadline: "",
  status: "todo",
  fixed_start: "",
  fixed_end: "",
  splittable: false,
  asap: true,
};

function TaskForm({ currentTask, isSaving, onSave, onCancel }) {
  const [values, setValues] = useState(emptyTask);

  useEffect(() => {
    if (!currentTask) {
      setValues(emptyTask);
      return;
    }

    setValues({
      title: currentTask.title || "",
      description: currentTask.description || "",
      priority: currentTask.priority || "medium",
      duration_minutes: currentTask.duration_minutes || 60,
      deadline: toLocalInputValue(currentTask.deadline),
      status: currentTask.status || "todo",
      fixed_start: toLocalInputValue(currentTask.fixed_start),
      fixed_end: toLocalInputValue(currentTask.fixed_end),
      splittable: Boolean(currentTask.splittable),
      asap: Boolean(currentTask.asap),
    });
  }, [currentTask]);

  function handleChange(event) {
    const { name, value, checked, type } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    await onSave({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      duration_minutes: Number(values.duration_minutes),
      deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
      fixed_start: values.fixed_start ? new Date(values.fixed_start).toISOString() : null,
      fixed_end: values.fixed_end ? new Date(values.fixed_end).toISOString() : null,
    });

    if (!currentTask) {
      setValues(emptyTask);
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input name="title" value={values.title} onChange={handleChange} required />
      </label>
      <label>
        Description
        <textarea name="description" value={values.description} onChange={handleChange} rows="3" />
      </label>
      <div className="form-row-grid">
        <label>
          Priority
          <select name="priority" value={values.priority} onChange={handleChange}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Minutes
          <input
            name="duration_minutes"
            type="number"
            min="1"
            value={values.duration_minutes}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <label>
        Deadline
        <input name="deadline" type="datetime-local" value={values.deadline} onChange={handleChange} />
      </label>
      <div className="form-row-grid">
        <label>
          Fixed start
          <input name="fixed_start" type="datetime-local" value={values.fixed_start} onChange={handleChange} />
        </label>
        <label>
          Fixed end
          <input name="fixed_end" type="datetime-local" value={values.fixed_end} onChange={handleChange} />
        </label>
      </div>
      <label>
        Status
        <select name="status" value={values.status} onChange={handleChange}>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="complete">Complete</option>
        </select>
      </label>
      <label className="checkbox-label">
        <input name="asap" type="checkbox" checked={values.asap} onChange={handleChange} />
        Complete as soon as possible
      </label>
      <label className="checkbox-label">
        <input name="splittable" type="checkbox" checked={values.splittable} onChange={handleChange} />
        Can split into sessions
      </label>
      <div className="button-row">
        <button className="primary-button" type="submit" disabled={isSaving}>
          {currentTask ? "Update task" : "Add task"}
        </button>
        {currentTask ? (
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function toLocalInputValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default TaskForm;
