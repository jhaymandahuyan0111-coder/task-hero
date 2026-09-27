import { useEffect, useState } from "react";

const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000/api"
  : "https://task-hero-bu79.onrender.com/api";

function currentUser() {
  return JSON.parse(localStorage.getItem("taskhero-user") || "null");
}

function go(path) {
  window.location.href = path;
}

function Navigation() {
  return (
    <nav className="navbar">
      <div className="logo" onClick={() => go("index.html")} title="TaskHero Home">
        <div className="logo-icon">T</div>TaskHero
      </div>
      <div className="nav-links">
        <button className="nav-button nav-icon-btn active" onClick={() => go("index.html")} title="Home" aria-label="Home">⌂</button>
        <button className="nav-button nav-icon-btn" onClick={() => go("my-task.html")} title="My Tasks" aria-label="My Tasks">✓</button>
        <button className="nav-button nav-icon-btn" onClick={() => go("messeges-page.html")} title="Messages" aria-label="Messages">▱</button>
      </div>
      <div className="nav-actions">
        <button className="icon-button post-task-button" onClick={() => go("post-task.html")} title="Post a Task" aria-label="Post a Task">+ Post Task</button>
        <button className="icon-button" onClick={() => go("auth.html")} title="Account" aria-label="Account">◉</button>
      </div>
    </nav>
  );
}

function Home() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const user = currentUser();

  async function loadTasks() {
    try {
      const [taskResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/tasks/stats`),
      ]);
      const taskResult = await taskResponse.json();
      const statsResult = await statsResponse.json();
      if (!taskResponse.ok || !taskResult.success) throw new Error(taskResult.message || "Unable to load tasks.");
      setTasks(taskResult.data.filter((task) => task.status === "open" && task.poster));
      if (statsResult.success) setStats(statsResult.data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  const visibleTasks = tasks.filter((task) => {
    const matchesFilter = filter === "all" || task.category === filter;
    const query = search.toLowerCase();
    const matchesSearch = !query || [task.title, task.category, task.location, task.description]
      .some((value) => value.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  async function acceptTask(task) {
    if (!user) return go("auth.html?returnTo=index.html");
    const response = await fetch(`${API_BASE}/tasks/${encodeURIComponent(task.id)}/accept`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptedBy: user.id }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) return setError(result.message || "Unable to accept task.");
    loadTasks();
  }

  return (
    <>
      <Navigation />
      <section className="page-container">
        <div className="page-header">
          <h1>Browse Tasks</h1>
          <div className="header-right">
            <div className="search-box"><span className="search-icon">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks, locations..." /></div>
            <button className="primary-button" onClick={() => go("post-task.html")}>+ Post Task</button>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-item"><div className="stat-number">{stats.openTasks ?? "—"}</div><div className="stat-label">Open Tasks</div></div>
          <div className="stat-item"><div className="stat-number">{stats.completedTasks ?? "—"}</div><div className="stat-label">Completed</div></div>
          <div className="stat-item"><div className="stat-number">{stats.activeUsers ?? "—"}</div><div className="stat-label">Active Users</div></div>
          <div className="stat-item"><div className="stat-number">₱{Number(stats.totalPaid || 0).toLocaleString()}</div><div className="stat-label">Paid Out</div></div>
        </div>
        <div className="filter-bar">
          {["all", "Image Editing", "Delivery", "Computer / IT", "Cleaning", "Moving", "Graphic Design", "Other"].map((category) => (
            <button key={category} className={`filter-btn ${filter === category ? "active" : ""}`} onClick={() => setFilter(category)}>{category === "all" ? "All" : category}</button>
          ))}
        </div>
        <div className="task-grid">
          {error && <div className="no-results"><h3>Unable to load tasks</h3><p>{error}</p></div>}
          {!error && !visibleTasks.length && <div className="no-results"><h3>No tasks found</h3><p>Try a different search or category filter.</p></div>}
          {visibleTasks.map((task) => (
            <div className="task-card" key={task.id}>
              <span className="category-tag">{task.category}</span>
              <div className="task-main"><h3>{task.title}</h3><p className="task-desc">{task.description}</p></div>
              <span className="task-meta-cell">{task.location}</span><span className="task-meta-cell">{task.deadline || "Flexible"}</span>
              <span className="task-poster-cell"><span className="task-poster-name">{task.poster.name}</span></span>
              <span className="task-budget">₱{Number(task.budget).toLocaleString()}</span>
              {user && task.postedBy === user.id
                ? <button className="accept-button" disabled>Your task</button>
                : <button className="accept-button" onClick={() => acceptTask(task)}>Accept</button>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function App() { return <Home />; }
