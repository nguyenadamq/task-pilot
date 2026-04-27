const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function AvailabilityList({ rules, onDelete, deletingId }) {
  if (!rules.length) {
    return <div className="empty-state">No weekly availability added yet.</div>;
  }

  return (
    <div className="simple-list">
      {rules.map((rule) => (
        <div className="list-row" key={rule.id}>
          <div>
            <strong>{dayLabels[rule.day_of_week]}</strong>
            <div className="helper-text">
              {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
            </div>
          </div>
          <button
            className="button-danger"
            type="button"
            onClick={() => onDelete(rule.id)}
            disabled={deletingId === rule.id}
          >
            {deletingId === rule.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}

function formatTime(value) {
  return value.slice(0, 5);
}

export default AvailabilityList;
