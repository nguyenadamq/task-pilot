import { useEffect, useState } from "react";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import { signOut } from "../services/auth";
import { createTask, deleteTask, getTasks, updateTask } from "../services/tasks";

function DashboardPage({ session }) {
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoadingTasks(true);
    setPageError("");

    try {
      const taskRows = await getTasks();
      setTasks(taskRows);
    } catch (error) {
      setPageError(error.message || "Could not load tasks.");
    } finally {
      setLoadingTasks(false);
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
    } catch (error) {
      setPageError(error.message || "Could not delete task.");
    } finally {
      setDeletingId(null);
    }
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
            {loadingTasks ? (
              <div className="empty-state">Loading tasks...</div>
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
      </div>
    </div>
  );
}

export default DashboardPage;
