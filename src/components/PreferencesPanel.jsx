import { useEffect, useState } from "react";

function PreferencesPanel({ preferences, isSaving, onSave }) {
  const [values, setValues] = useState({
    preferred_start_time: "09:00",
    preferred_end_time: "18:00",
    max_work_minutes_per_day: 300,
    buffer_minutes: 10,
    horizon_days: 7,
    overflow_allowed: true,
  });

  useEffect(() => {
    if (preferences) {
      setValues({
        preferred_start_time: preferences.preferred_start_time || "09:00",
        preferred_end_time: preferences.preferred_end_time || "18:00",
        max_work_minutes_per_day: preferences.max_work_minutes_per_day || 300,
        buffer_minutes: preferences.buffer_minutes || 10,
        horizon_days: preferences.horizon_days || 7,
        overflow_allowed: preferences.overflow_allowed ?? true,
      });
    }
  }, [preferences]);

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
      max_work_minutes_per_day: Number(values.max_work_minutes_per_day),
      buffer_minutes: Number(values.buffer_minutes),
      horizon_days: Number(values.horizon_days),
    });
  }

  return (
    <section className="panel">
      <h2>Schedule Preferences</h2>
      <form className="stacked-form" onSubmit={handleSubmit}>
        <div className="form-row-grid">
          <label>
            Preferred start
            <input name="preferred_start_time" type="time" value={values.preferred_start_time} onChange={handleChange} />
          </label>
          <label>
            Preferred end
            <input name="preferred_end_time" type="time" value={values.preferred_end_time} onChange={handleChange} />
          </label>
        </div>
        <div className="form-row-grid">
          <label>
            Daily work cap
            <input
              name="max_work_minutes_per_day"
              type="number"
              min="30"
              value={values.max_work_minutes_per_day}
              onChange={handleChange}
            />
          </label>
          <label>
            Buffer minutes
            <input name="buffer_minutes" type="number" min="0" value={values.buffer_minutes} onChange={handleChange} />
          </label>
        </div>
        <label>
          Horizon days
          <input name="horizon_days" type="number" min="1" max="21" value={values.horizon_days} onChange={handleChange} />
        </label>
        <label className="checkbox-label">
          <input name="overflow_allowed" type="checkbox" checked={values.overflow_allowed} onChange={handleChange} />
          Use late/overflow time if needed
        </label>
        <button className="primary-button" type="submit" disabled={isSaving}>
          Save preferences
        </button>
      </form>
    </section>
  );
}

export default PreferencesPanel;
