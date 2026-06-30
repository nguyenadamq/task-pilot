import { useState } from "react";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const emptyRule = {
  title: "",
  kind: "work",
  day_of_weeks: [1, 2, 3, 4, 5],
  start_time: "09:00",
  end_time: "17:00",
};

function AvailabilityPanel({ rules, isSaving, onAddRule, onDeleteRule }) {
  const [values, setValues] = useState(emptyRule);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function toggleDay(dayIndex) {
    setValues((current) => {
      const selected = current.day_of_weeks.includes(dayIndex)
        ? current.day_of_weeks.filter((day) => day !== dayIndex)
        : [...current.day_of_weeks, dayIndex].sort((a, b) => a - b);

      return {
        ...current,
        day_of_weeks: selected,
      };
    });
  }

  function selectDays(dayIndexes) {
    setValues((current) => ({
      ...current,
      day_of_weeks: dayIndexes,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!values.day_of_weeks.length) {
      return;
    }

    await onAddRule(values.day_of_weeks.map((dayOfWeek) => ({
      ...values,
      title: values.title.trim() || labelForKind(values.kind),
      day_of_week: dayOfWeek,
    })));
    setValues(emptyRule);
  }

  return (
    <section className="panel">
      <h2>Availability</h2>
      <form className="stacked-form" onSubmit={handleSubmit}>
        <label>
          Type
          <select name="kind" value={values.kind} onChange={handleChange}>
            <option value="work">Work</option>
            <option value="sleep">Sleep</option>
            <option value="unavailable">Unavailable</option>
            <option value="preferred">Preferred work</option>
          </select>
        </label>

        <fieldset className="day-picker">
          <legend>Days</legend>
          <div className="preset-row">
            <button className="secondary-button compact-button" type="button" onClick={() => selectDays([1, 2, 3, 4, 5])}>
              Weekdays
            </button>
            <button className="secondary-button compact-button" type="button" onClick={() => selectDays([0, 6])}>
              Weekend
            </button>
            <button className="secondary-button compact-button" type="button" onClick={() => selectDays([0, 1, 2, 3, 4, 5, 6])}>
              Every day
            </button>
          </div>
          <div className="day-button-grid">
            {dayNames.map((day, index) => (
              <button
                className={values.day_of_weeks.includes(index) ? "day-button active" : "day-button"}
                key={day}
                type="button"
                onClick={() => toggleDay(index)}
                aria-pressed={values.day_of_weeks.includes(index)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          Label
          <input name="title" value={values.title} onChange={handleChange} placeholder="Class, sleep, work" />
        </label>
        <div className="form-row-grid">
          <label>
            Start
            <input name="start_time" type="time" value={values.start_time} onChange={handleChange} required />
          </label>
          <label>
            End
            <input name="end_time" type="time" value={values.end_time} onChange={handleChange} required />
          </label>
        </div>
        <button className="primary-button" type="submit" disabled={isSaving || !values.day_of_weeks.length}>
          Add {values.day_of_weeks.length || ""} rule{values.day_of_weeks.length === 1 ? "" : "s"}
        </button>
      </form>

      <div className="list-stack compact-list">
        {rules.map((rule) => (
          <div className="list-item" key={rule.id}>
            <div>
              <h3>{rule.title}</h3>
              <p className="meta-line">
                {dayNames[rule.day_of_week]} | {rule.kind} | {rule.start_time.slice(0, 5)}-
                {rule.end_time.slice(0, 5)}
              </p>
            </div>
            <button className="danger-button" type="button" onClick={() => onDeleteRule(rule.id)} disabled={isSaving}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function labelForKind(kind) {
  return {
    work: "Work",
    sleep: "Sleep",
    unavailable: "Unavailable",
    preferred: "Preferred work",
  }[kind];
}

export default AvailabilityPanel;
