import { useEffect, useState } from "react";
import DashboardSummary from "../components/DashboardSummary";
import FixedEventForm from "../components/FixedEventForm";
import FixedEventList from "../components/FixedEventList";
import NotificationPanel from "../components/NotificationPanel";
import SchedulePreview from "../components/SchedulePreview";
import SleepForm from "../components/SleepForm";
import SleepList from "../components/SleepList";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import { signOut } from "../services/auth";
import { createFixedEvent, deleteFixedEvent, getFixedEvents } from "../services/fixedEvents";
import { generateWeeklySchedule, repairWeeklySchedule } from "../services/scheduler";
import { createSleepRule, deleteSleepRule, getSleepRules } from "../services/sleep";
import { createTask, deleteTask, getTasks, updateTask } from "../services/tasks";

function DashboardPage({ session }) {
  const [tasks, setTasks] = useState([]);
  const [sleepRules, setSleepRules] = useState([]);
  const [fixedEvents, setFixedEvents] = useState([]);
  const [schedulePlan, setSchedulePlan] = useState(null);
  const [repairedPlan, setRepairedPlan] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSleep, setIsSavingSleep] = useState(false);
  const [isSavingFixedEvent, setIsSavingFixedEvent] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingSleepId, setDeletingSleepId] = useState("");
  const [deletingFixedEventId, setDeletingFixedEventId] = useState(null);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoadingPage(true);
    setPageError("");

    try {
      const [taskRows, ruleRows, fixedEventRows] = await Promise.all([
        getTasks(),
        getSleepRules(),
        getFixedEvents(),
      ]);

      setTasks(taskRows);
      setSleepRules(ruleRows);
      setFixedEvents(fixedEventRows);
    } catch (error) {
      setPageError(error.message || "Could not load dashboard data.");
    } finally {
      setLoadingPage(false);
    }
  }

  async function handleSave(taskValues) {
    setIsSaving(true);
    setPageError("");

    try {
      if (currentTask) {
        const updatedTask = await updateTask(currentTask.id, taskValues);
        setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
        setCurrentTask(null);
      } else {
        const newTask = await createTask(taskValues);
        setTasks((prev) => [newTask, ...prev]);
      }

      setSchedulePlan(null);
      setRepairedPlan(null);
    } catch (error) {
      setPageError(error.message || "Could not save task.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(taskId) {
    setDeletingId(taskId);
    setPageError("");

    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      if (currentTask && currentTask.id === taskId) {
        setCurrentTask(null);
      }

      setSchedulePlan(null);
      setRepairedPlan(null);
    } catch (error) {
      setPageError(error.message || "Could not delete task.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddSleep(values) {
    setIsSavingSleep(true);
    setPageError("");

    try {
      const newRules = await createSleepRule(values);
      const updatedDays = newRules.map((rule) => rule.day_of_week);

      setSleepRules((prev) =>
        [...prev.filter((rule) => !updatedDays.includes(rule.day_of_week)), ...newRules].sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) {
            return a.day_of_week - b.day_of_week;
          }

          return a.start_time.localeCompare(b.start_time);
        })
      );
      setSchedulePlan(null);
      setRepairedPlan(null);
    } catch (error) {
      setPageError(error.message || "Could not save sleep schedule.");
    } finally {
      setIsSavingSleep(false);
    }
  }

  async function handleDeleteSleep(ruleIds) {
    const ids = Array.isArray(ruleIds) ? ruleIds : [ruleIds];
    const deleteKey = ids.length === 5 ? "weekdays" : ids.length === 2 ? "weekends" : ids[0];

    setDeletingSleepId(deleteKey);
    setPageError("");

    try {
      await deleteSleepRule(ids);
      setSleepRules((prev) => prev.filter((rule) => !ids.includes(rule.id)));
      setSchedulePlan(null);
      setRepairedPlan(null);
    } catch (error) {
      setPageError(error.message || "Could not delete sleep schedule.");
    } finally {
      setDeletingSleepId("");
    }
  }

  async function handleAddFixedEvent(values) {
    setIsSavingFixedEvent(true);
    setPageError("");

    try {
      const newEvent = await createFixedEvent(values);
      setFixedEvents((prev) =>
        [...prev, newEvent].sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) {
            return a.day_of_week - b.day_of_week;
          }

          return a.start_time.localeCompare(b.start_time);
        })
      );
      setSchedulePlan(null);
      setRepairedPlan(null);
    } catch (error) {
      setPageError(error.message || "Could not save fixed block.");
    } finally {
      setIsSavingFixedEvent(false);
    }
  }

  async function handleDeleteFixedEvent(eventId) {
    setDeletingFixedEventId(eventId);
    setPageError("");

    try {
      await deleteFixedEvent(eventId);
      setFixedEvents((prev) => prev.filter((event) => event.id !== eventId));
      setSchedulePlan(null);
      setRepairedPlan(null);
    } catch (error) {
      setPageError(error.message || "Could not delete fixed block.");
    } finally {
      setDeletingFixedEventId(null);
    }
  }

  function handleGenerateSchedule() {
    const nextPlan = generateWeeklySchedule({
      tasks,
      sleepRules,
      fixedEvents,
    });

    setSchedulePlan(nextPlan);
    setRepairedPlan(null);
  }

  function handleRepairSchedule() {
    if (!schedulePlan) {
      return;
    }

    const nextRepairedPlan = repairWeeklySchedule({
      originalPlan: schedulePlan,
      tasks,
      sleepRules,
      fixedEvents,
    });

    setRepairedPlan(nextRepairedPlan);
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      setPageError(error.message || "Could not sign out.");
    }
  }

  return (
    <div className="page-shell">
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="helper-text">Signed in as {session.user.email}</p>
          </div>
          <button className="button-secondary" type="button" onClick={handleSignOut}>
            Log out
          </button>
        </div>

        {pageError ? <p className="error-text">{pageError}</p> : null}

        <DashboardSummary
          tasks={tasks}
          sleepRules={sleepRules}
          fixedEvents={fixedEvents}
          activePlan={repairedPlan || schedulePlan}
        />

        <div className="dashboard-grid">
          <div className="card">
            <h2>{currentTask ? "Edit Task" : "Add Task"}</h2>
            <TaskForm
              currentTask={currentTask}
              onSave={handleSave}
              onCancel={() => setCurrentTask(null)}
              isSaving={isSaving}
            />
          </div>

          <div>
            {loadingPage ? (
              <div className="empty-state">Loading dashboard...</div>
            ) : (
              <TaskList
                tasks={tasks}
                onEdit={setCurrentTask}
                onDelete={handleDelete}
                isDeletingId={deletingId}
              />
            )}
          </div>
        </div>

        <NotificationPanel tasks={tasks} activePlan={repairedPlan || schedulePlan} />

        <div className="two-column-grid">
          <div className="card">
            <h2>Sleep Schedule</h2>
            <p className="helper-text">
              Add when you usually sleep. The scheduler will avoid these hours automatically.
            </p>
            <SleepForm onSave={handleAddSleep} isSaving={isSavingSleep} />
            <SleepList
              rules={sleepRules}
              onDelete={handleDeleteSleep}
              deletingId={deletingSleepId}
            />
          </div>

          <div className="card">
            <h2>Recurring Fixed Blocks</h2>
            <p className="helper-text">
              Use this for class, work, gym, or other times when you are busy.
            </p>
            <FixedEventForm onSave={handleAddFixedEvent} isSaving={isSavingFixedEvent} />
            <FixedEventList
              events={fixedEvents}
              onDelete={handleDeleteFixedEvent}
              deletingId={deletingFixedEventId}
            />
          </div>
        </div>

        <div className="section-stack">
          <div className="dashboard-header">
            <div>
              <h2>Week 8 Schedule Preview</h2>
              <p className="helper-text">
                This starts from your full day, blocks sleep and recurring busy time, and then
                tries to place work in what is left.
              </p>
            </div>
            <div className="button-row">
              <button className="button-primary" type="button" onClick={handleGenerateSchedule}>
                Generate schedule
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={handleRepairSchedule}
                disabled={!schedulePlan}
              >
                Repair schedule
              </button>
            </div>
          </div>

          {schedulePlan ? <SchedulePreview plan={schedulePlan} title="Original Schedule" /> : null}
          {repairedPlan ? <SchedulePreview plan={repairedPlan} title="Repaired Schedule" /> : null}
          {!schedulePlan ? <SchedulePreview plan={schedulePlan} /> : null}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
