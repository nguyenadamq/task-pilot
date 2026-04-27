import { useState } from "react";

const defaultValues = {
  title: "",
  day_of_week: "1",
  start_time: "10:00",
  end_time: "11:00",
};

function FixedEventForm({ onSave, isSaving }) {
  const [formData, setFormData] = useState(defaultValues);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setErrorMessage("End time must be after start time.");
      return;
    }

    setErrorMessage("");
    await onSave({
      title: formData.title.trim(),
      day_of_week: Number(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
    });
    setFormData(defaultValues);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="fixed-title">Title</label>
        <input
          id="fixed-title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="fixed-day">Day</label>
        <select id="fixed-day" name="day_of_week" value={formData.day_of_week} onChange={handleChange}>
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="fixed-start">Start time</label>
        <input
          id="fixed-start"
          name="start_time"
          type="time"
          value={formData.start_time}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="fixed-end">End time</label>
        <input
          id="fixed-end"
          name="end_time"
          type="time"
          value={formData.end_time}
          onChange={handleChange}
          required
        />
      </div>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <div className="button-row">
        <button className="button-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Add fixed block"}
        </button>
      </div>
    </form>
  );
}

export default FixedEventForm;
