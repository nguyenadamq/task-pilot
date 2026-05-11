import { useEffect, useState } from "react";
import AvailabilityForm from "../components/AvailabilityForm";
import AvailabilityList from "../components/AvailabilityList";
import FixedEventForm from "../components/FixedEventForm";
import FixedEventList from "../components/FixedEventList";
import SchedulePreview from "../components/SchedulePreview";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import { createAvailabilityRule, deleteAvailabilityRule, getAvailabilityRules } from "../services/availability";
import { signOut } from "../services/auth";
import { createFixedEvent, deleteFixedEvent, getFixedEvents } from "../services/fixedEvents";
import { generateWeeklySchedule } from "../services/scheduler";
import { createTask, deleteTask, getTasks, updateTask } from "../services/tasks";

function DashboardPage({ session }) {
  const [tasks, setTasks] = useState([]);
  const [availabilityRules, setAvailabilityRules] = useState([]);
  const [fixedEvents, setFixedEvents] = useState([]);
  const [schedulePlan, setSchedulePlan] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [isSavingFixedEvent, setIsSavingFixedEvent] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAvailabilityId, setDeletingAvailabilityId] = useState(null);
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
        getAvailabilityRules(),
        getFixedEvents(),
      ]);

      setTasks(taskRows);
      setAvailabilityRules(ruleRows);
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
    } catch (error) {
      setPageError(error.message || "Could not delete task.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddAvailability(values) {
    setIsSavingAvailability(true);
    setPageError("");

    try {
      const newRule = await createAvailabilityRule(values);
      setAvailabilityRules((prev) =>
        [...prev, newRule].sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) {
            return a.day_of_week - b.day_of_week;
          }

          return a.start_time.localeCompare(b.start_time);
        })
      );
      setSchedulePlan(null);
    } catch (error) {
      setPageError(error.message || "Could not save availability.");
    } finally {
      setIsSavingAvailability(false);
    }
  }

  async function handleDeleteAvailability(ruleId) {
    setDeletingAvailabilityId(ruleId);
    setPageError("");

    try {
      await deleteAvailabilityRule(ruleId);
      setAvailabilityRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      setSchedulePlan(null);
    } catch (error) {
      setPageError(error.message || "Could not delete availability.");
    } finally {
      setDeletingAvailabilityId(null);
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
    } catch (error) {
      setPageError(error.message || "Could not delete fixed block.");
    } finally {
      setDeletingFixedEventId(null);
    }
  }

  function handleGenerateSchedule() {
    setSchedulePlan(
      generateWeeklySchedule({
        tasks,
        availabilityRules,
        fixedEvents,
      })
    );
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

        <div className="two-column-grid">
          <div className="card">
            <h2>Weekly Availability</h2>
            <p className="helper-text">Add the times when you are generally free to work.</p>
            <AvailabilityForm onSave={handleAddAvailability} isSaving={isSavingAvailability} />
            <AvailabilityList
              rules={availabilityRules}
              onDelete={handleDeleteAvailability}
              deletingId={deletingAvailabilityId}
            />
          </div>

          <div className="card">
            <h2>Recurring Fixed Blocks</h2>
            <p className="helper-text">Use this for class, work, or other repeating commitments.</p>
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
              <h2>Week 6 Schedule Preview</h2>
              <p className="helper-text">
                This tries a few simple scheduling strategies, scores them, and keeps the strongest
                7-day plan.
              </p>
            </div>
            <button className="button-primary" type="button" onClick={handleGenerateSchedule}>
              Generate schedule
            </button>
          </div>

          <SchedulePreview plan={schedulePlan} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
