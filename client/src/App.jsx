import { useState, useEffect } from "react";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Fetch tasks from our Express REST API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const url = filter === "all" ? "/api/tasks" : `/api/tasks?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  // 2. Add a new task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, status: "pending" }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Update task status (PATCH)
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Delete task
  const handleDeleteTask = async (id) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Compute stats counts
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>Task Manager</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Express REST API + MongoDB + MCP Synced
          </p>
        </div>
        <span className="badge-connected">● API Online</span>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Tasks</span>
          <span className="stat-value">{totalCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ color: "var(--status-pending)" }}>
            Pending
          </span>
          <span className="stat-value">{pendingCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ color: "var(--status-progress)" }}>
            In Progress
          </span>
          <span className="stat-value">{inProgressCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ color: "var(--status-completed)" }}>
            Completed
          </span>
          <span className="stat-value">{completedCount}</span>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="form-card">
        <div className="form-inputs">
          <input
            className="input-title"
            type="text"
            placeholder="Task title (e.g., Deploy to AWS)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="input-desc"
            type="text"
            placeholder="Description (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            + Add Task
          </button>
        </div>
      </form>

      {/* Filter Buttons */}
      <div className="filter-bar">
        {["all", "pending", "in-progress", "completed"].map((st) => (
          <button
            key={st}
            className={`btn-filter ${filter === st ? "active" : ""}`}
            onClick={() => setFilter(st)}
          >
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="task-list">
        {loading ? (
          <div className="empty-state">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">No tasks found. Create one above!</div>
        ) : (
          tasks.map((task) => (
            <div key={task._id} className="task-item">
              <div className="task-content">
                <span
                  className="task-title"
                  style={{
                    textDecoration: task.status === "completed" ? "line-through" : "none",
                    opacity: task.status === "completed" ? 0.6 : 1,
                  }}
                >
                  {task.title}
                </span>
                {task.description && (
                  <span className="task-desc">{task.description}</span>
                )}
              </div>

              <div className="task-actions">
                <select
                  className="status-select"
                  value={task.status}
                  onChange={(e) => handleStatusChange(task._id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <button
                  className="btn-delete"
                  onClick={() => handleDeleteTask(task._id)}
                  title="Delete task"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
