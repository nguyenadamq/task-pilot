const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function FixedEventList({ events, onDelete, deletingId }) {
  if (!events.length) {
    return <div className="empty-state">No recurring fixed blocks added yet.</div>;
  }

  return (
    <div className="simple-list">
      {events.map((event) => (
        <div className="list-row" key={event.id}>
          <div>
            <strong>{event.title}</strong>
            <div className="helper-text">
              {dayLabels[event.day_of_week]} {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </div>
          </div>
          <button
            className="button-danger"
            type="button"
            onClick={() => onDelete(event.id)}
            disabled={deletingId === event.id}
          >
            {deletingId === event.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}

function formatTime(value) {
  return value.slice(0, 5);
}

export default FixedEventList;
