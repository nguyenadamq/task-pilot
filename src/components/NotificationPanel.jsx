function NotificationPanel({ tasks, activePlan }) {
  const notices = buildNotices(tasks, activePlan);

  return (
    <div className="card panel-card">
      {notices.length ? (
        <div className="simple-list">
          {notices.map((notice, index) => (
            <div className={`notice-card notice-${notice.type}`} key={`${notice.type}-${index}`}>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="helper-text">No urgent updates right now.</p>
      )}
    </div>
  );
}

function buildNotices(tasks, activePlan) {
  const notices = [];
  const overdueTasks = tasks.filter((task) => isOverdue(task));
  const dueSoonTasks = tasks.filter((task) => isDueSoon(task));
  const activeItems = activePlan ? getUpcomingItems(activePlan.scheduledItems || []) : [];

  if (overdueTasks.length) {
    notices.push({
      type: "error",
      title: "Overdue tasks",
      message: `${overdueTasks.length} task${overdueTasks.length === 1 ? "" : "s"} already passed the deadline.`,
    });
  }

  if (dueSoonTasks.length) {
    notices.push({
      type: "warning",
      title: "Deadlines coming up",
      message: `${dueSoonTasks.length} task${dueSoonTasks.length === 1 ? "" : "s"} need attention within the next 24 hours.`,
    });
  }

  if (activePlan && activePlan.unscheduledTasks.length) {
    notices.push({
      type: "warning",
      title: "Unscheduled work",
      message: `${activePlan.unscheduledTasks.length} task${activePlan.unscheduledTasks.length === 1 ? "" : "s"} still do not fit in the current plan.`,
    });
  }

  if (activeItems.length) {
    const nextItem = activeItems[0];
    notices.push({
      type: "info",
      title: "Next scheduled block",
      message: `${nextItem.title} starts ${formatRelativeTime(nextItem.start)}.`,
    });
  }

  return notices;
}

function getUpcomingItems(items) {
  const now = new Date();
  const twelveHoursFromNow = new Date(now.getTime() + 12 * 3600000);

  return [...items]
    .filter((item) => {
      const start = new Date(item.start);
      return start >= now && start <= twelveHoursFromNow;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function isOverdue(task) {
  if (!task.deadline || task.status === "done") {
    return false;
  }

  return new Date(task.deadline) < new Date();
}

function isDueSoon(task) {
  if (!task.deadline || task.status === "done") {
    return false;
  }

  const now = new Date();
  const deadline = new Date(task.deadline);
  const diffHours = (deadline.getTime() - now.getTime()) / 3600000;
  return diffHours >= 0 && diffHours <= 24;
}

function formatRelativeTime(value) {
  const start = new Date(value);
  const now = new Date();
  const diffHours = Math.round((start.getTime() - now.getTime()) / 3600000);

  if (diffHours <= 1) {
    return "soon";
  }

  if (diffHours < 24) {
    return `in about ${diffHours} hours`;
  }

  return start.toLocaleString();
}

export default NotificationPanel;
