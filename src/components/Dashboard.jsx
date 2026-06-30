import { useEffect, useMemo, useState } from "react";
import {
  completeTask,
  createAvailabilityRule,
  createTask,
  deleteAvailabilityRule,
  deleteTask,
  extendScheduleBlock,
  generateSchedule,
  getBootstrap,
  updatePreferences,
  updateTask,
} from "../lib/api";
import { supabase } from "../lib/supabase";
import AvailabilityPanel from "./AvailabilityPanel";
import CurrentTaskPanel from "./CurrentTaskPanel";
import PreferencesPanel from "./PreferencesPanel";
import SchedulePanel from "./SchedulePanel";
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";

function Dashboard({ session }) {
  const [tasks, setTasks] = useState([]);
  const [availabilityRules, setAvailabilityRules] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeBlocks = useMemo(() => schedule?.blocks || [], [schedule]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const data = await getBootstrap();
      setTasks(data.tasks);
      setAvailabilityRules(data.availabilityRules);
      setPreferences(data.preferences);
      setSchedule(data.schedule);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action) {
    setSaving(true);
    setError("");

    try {
      await action();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTask(values) {
    await runAction(async () => {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, values);
        setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
        setEditingTask(null);
      } else {
        const created = await createTask(values);
        setTasks((current) => [created, ...current]);
      }

      setSchedule(await generateSchedule());
    });
  }

  async function handleCompleteTask(taskId) {
    await runAction(async () => {
      const updated = await completeTask(taskId);
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      setSchedule((current) =>
        current
          ? {
              ...current,
              blocks: current.blocks.filter((block) => block.task_id !== taskId),
            }
          : current
      );
    });
  }

  async function handleDeleteTask(taskId) {
    await runAction(async () => {
      await deleteTask(taskId);
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setEditingTask((current) => (current?.id === taskId ? null : current));
      setSchedule(await generateSchedule());
    });
  }

  async function handleAddAvailability(values) {
    await runAction(async () => {
      const ruleValues = Array.isArray(values) ? values : [values];
      const createdRules = await Promise.all(ruleValues.map((rule) => createAvailabilityRule(rule)));
      setAvailabilityRules((current) =>
        [...current, ...createdRules].sort(
          (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
        )
      );
      setSchedule(await generateSchedule());
    });
  }

  async function handleDeleteAvailability(ruleId) {
    await runAction(async () => {
      await deleteAvailabilityRule(ruleId);
      setAvailabilityRules((current) => current.filter((rule) => rule.id !== ruleId));
      setSchedule(await generateSchedule());
    });
  }

  async function handleSavePreferences(values) {
    await runAction(async () => {
      setPreferences(await updatePreferences(values));
      setSchedule(await generateSchedule());
    });
  }

  async function handleGenerateSchedule() {
    await runAction(async () => {
      setSchedule(await generateSchedule());
    });
  }

  async function handleExtendBlock(blockId, minutes) {
    await runAction(async () => {
      setSchedule(await extendScheduleBlock(blockId, minutes));
    });
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>Task Pilot</h1>
          <p>{session.user.email}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => supabase.auth.signOut()}>
          Log out
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <div className="empty-state">Loading dashboard...</div>
      ) : (
        <>
          <CurrentTaskPanel blocks={activeBlocks} onExtendBlock={handleExtendBlock} isSaving={saving} />

          <section className="workspace-grid">
            <div className="control-column">
              <section className="panel compact-panel">
                <div className="section-heading">
                  <h2>{editingTask ? "Edit Task" : "Tasks"}</h2>
                  {saving ? <span className="saving-pill">Updating schedule...</span> : null}
                </div>
                <TaskForm
                  currentTask={editingTask}
                  isSaving={saving}
                  onSave={handleSaveTask}
                  onCancel={() => setEditingTask(null)}
                />
                <TaskList
                  tasks={tasks}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                  onComplete={handleCompleteTask}
                  isSaving={saving}
                />
              </section>

              <AvailabilityPanel
                rules={availabilityRules}
                isSaving={saving}
                onAddRule={handleAddAvailability}
                onDeleteRule={handleDeleteAvailability}
              />

              <PreferencesPanel preferences={preferences} isSaving={saving} onSave={handleSavePreferences} />
            </div>

            <div className="schedule-column">
              <SchedulePanel schedule={schedule} isSaving={saving} onGenerate={handleGenerateSchedule} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default Dashboard;
