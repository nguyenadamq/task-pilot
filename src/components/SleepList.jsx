function SleepList({ rules, onDelete, deletingId }) {
  if (!rules.length) {
    return <div className="empty-state">No sleep schedule added yet.</div>;
  }

  const groups = buildSleepGroups(rules);

  return (
    <div className="simple-list">
      {groups.map((group) => (
        <div className="list-row" key={group.key}>
          <div>
            <strong>{group.label}</strong>
            <div className="helper-text">
              Sleep {formatTime(group.start_time)} - {formatTime(group.end_time)}
            </div>
          </div>
          <button
            className="button-danger"
            type="button"
            onClick={() => onDelete(group.ids)}
            disabled={deletingId === group.key}
          >
            {deletingId === group.key ? "Deleting..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}

function buildSleepGroups(rules) {
  const sortedRules = [...rules].sort((a, b) => a.day_of_week - b.day_of_week);
  const groups = [];
  const weekdayRules = sortedRules.filter((rule) => rule.day_of_week >= 0 && rule.day_of_week <= 4);
  const weekendRules = sortedRules.filter((rule) => rule.day_of_week >= 5 && rule.day_of_week <= 6);

  const weekdayGroup = createGroupIfMatching("weekdays", "Sunday-Thursday", weekdayRules, [0, 1, 2, 3, 4]);
  const weekendGroup = createGroupIfMatching("weekends", "Friday-Saturday", weekendRules, [5, 6]);

  if (weekdayGroup) {
    groups.push(weekdayGroup);
  } else {
    groups.push(...weekdayRules.map((rule) => createSingleDayGroup(rule)));
  }

  if (weekendGroup) {
    groups.push(weekendGroup);
  } else {
    groups.push(...weekendRules.map((rule) => createSingleDayGroup(rule)));
  }

  return groups;
}

function createGroupIfMatching(key, label, rules, expectedDays) {
  if (rules.length !== expectedDays.length) {
    return null;
  }

  const daysMatch = expectedDays.every((day, index) => rules[index].day_of_week === day);

  if (!daysMatch) {
    return null;
  }

  const firstRule = rules[0];
  const allSameTimes = rules.every(
    (rule) => rule.start_time === firstRule.start_time && rule.end_time === firstRule.end_time
  );

  if (!allSameTimes) {
    return null;
  }

  return {
    key,
    label,
    ids: rules.map((rule) => rule.id),
    start_time: firstRule.start_time,
    end_time: firstRule.end_time,
  };
}

function createSingleDayGroup(rule) {
  return {
    key: rule.id,
    label: formatDayLabel(rule.day_of_week),
    ids: [rule.id],
    start_time: rule.start_time,
    end_time: rule.end_time,
  };
}

function formatDayLabel(dayOfWeek) {
  const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return dayLabels[dayOfWeek];
}

function formatTime(value) {
  return value.slice(0, 5);
}

export default SleepList;
