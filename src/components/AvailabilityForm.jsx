import { useState } from "react";

const defaultValues = {
  day_of_week: "1",
  start_time: "09:00",
  end_time: "17:00",
};

function AvailabilityForm({ onSave, isSaving }) {
  const [formData, setFormData] = useState(defaultValues);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (formData.start_time >= formData.end_time) {
      setErrorMessage("End time must be after start time.");
      return;
    }

    setErrorMessage("");
    await onSave({
      day_of_week: Number(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
    });
    setFormData(defaultValues);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="availability-day">Day</label>
        <select
          id="availability-day"
          name="day_of_week"
          value={formData.day_of_week}
          onChange={handleChange}
        >
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
        <label htmlFor="availability-start">Start time</label>
        <input
          id="availability-start"
          name="start_time"
          type="time"
          value={formData.start_time}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="availability-end">End time</label>
        <input
          id="availability-end"
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
          {isSaving ? "Saving..." : "Add availability"}
        </button>
      </div>
    </form>
  );
}

export default AvailabilityForm;
