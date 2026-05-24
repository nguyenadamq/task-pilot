function DashboardSummary({ tasks, sleepRules, fixedEvents, activePlan }) {
  const totalTasks = tasks.length;
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const overdueTasks = tasks.filter((task) => isOverdue(task)).length;
  const dueSoonTasks = tasks.filter((task) => isDueSoon(task)).length;
  const unscheduledCount = activePlan ? activePlan.unscheduledTasks.length : 0;

  return (
    <div className="summary-grid">
      <div className="summary-card">
        <span className="summary-label">Open Tasks</span>
        <strong>{openTasks}</strong>
        <span className="helper-text">{totalTasks} total tasks</span>
      </div>

      <div className="summary-card">
        <span className="summary-label">Overdue</span>
        <strong>{overdueTasks}</strong>
        <span className="helper-text">{dueSoonTasks} due soon</span>
      </div>

      <div className="summary-card">
        <span className="summary-label">Sleep Setup</span>
        <strong>{sleepRules.length}</strong>
        <span className="helper-text">{fixedEvents.length} recurring busy blocks</span>
      </div>

      <div className="summary-card">
        <span className="summary-label">Schedule Issues</span>
        <strong>{unscheduledCount}</strong>
        <span className="helper-text">unscheduled items in current plan</span>
      </div>
    </div>
  );
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

export default DashboardSummary;
