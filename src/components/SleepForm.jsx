import { useState } from "react";

const defaultValues = {
  sleep_group: "weekdays",
  start_time: "23:00",
  end_time: "07:00",
};

function SleepForm({ onSave, isSaving }) {
  const [formData, setFormData] = useState(defaultValues);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (formData.start_time === formData.end_time) {
      setErrorMessage("Sleep start and wake time cannot be the same.");
      return;
    }

    setErrorMessage("");
    await onSave({
      sleep_group: formData.sleep_group,
      start_time: formData.start_time,
      end_time: formData.end_time,
    });
    setFormData(defaultValues);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="sleep-group">Sleep group</label>
        <select
          id="sleep-group"
          name="sleep_group"
          value={formData.sleep_group}
          onChange={handleChange}
        >
          <option value="weekdays">Sunday-Thursday</option>
          <option value="weekends">Friday-Saturday</option>
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="sleep-start">Sleep time</label>
        <input
          id="sleep-start"
          name="start_time"
          type="time"
          value={formData.start_time}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="sleep-end">Wake time</label>
        <input
          id="sleep-end"
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
          {isSaving ? "Saving..." : "Add sleep schedule"}
        </button>
      </div>
    </form>
  );
}

export default SleepForm;
