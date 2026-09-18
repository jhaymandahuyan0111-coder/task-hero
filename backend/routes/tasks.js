/* =========================================================
   TASKHERO - TASKS ROUTES
   Base: /api/tasks
   ========================================================= */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

/* ─────────────────────────────────────────────────────────
   VALID CATEGORIES
   ───────────────────────────────────────────────────────── */
const VALID_CATEGORIES = [
  "Image Editing",
  "Delivery",
  "Cleaning",
  "Computer / IT",
  "School / Academic",
  "Moving",
  "Graphic Design",
  "Other",
];

/* ─────────────────────────────────────────────────────────
   GET /api/tasks
   Returns all open tasks (supports filtering + search).

   Query params:
   - category  : filter by category
   - search    : text search on title, description, location
   - status    : filter by status (open / accepted / completed)
   - postedBy  : filter by user id
   ───────────────────────────────────────────────────────── */
router.get("/", (req, res) => {
  const { category, search, status, postedBy } = req.query;

  let result = [...db.tasks];

  if (category) {
    result = result.filter(
      (t) => t.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (status) {
    result = result.filter((t) => t.status === status);
  }

  if (postedBy) {
    result = result.filter((t) => t.postedBy === postedBy);
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }

  // Sort newest first
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    count: result.length,
    data: result,
  });
});

/* ─────────────────────────────────────────────────────────
   GET /api/tasks/stats
   Returns aggregate stats for the home page.
   ───────────────────────────────────────────────────────── */
router.get("/stats", (req, res) => {
  const open      = db.tasks.filter((t) => t.status === "open").length;
  const accepted  = db.tasks.filter((t) => t.status === "accepted").length;
  const completed = db.tasks.filter((t) => t.status === "completed").length;
  const totalPaid = db.tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.budget, 0);

  res.json({
    success: true,
    data: {
      openTasks:      open,
      acceptedTasks:  accepted,
      completedTasks: completed,
      activeUsers:    db.users.length,
      totalPaid,
    },
  });
});

/* ─────────────────────────────────────────────────────────
   GET /api/tasks/:id
   Returns a single task by id.
   ───────────────────────────────────────────────────────── */
router.get("/:id", (req, res) => {
  const task = db.tasks.find((t) => t.id === req.params.id);

  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found." });
  }

  // Attach poster info (without password)
  const poster = db.users.find((u) => u.id === task.postedBy);
  const result = {
    ...task,
    poster: poster
      ? { id: poster.id, name: poster.name, avatar: poster.avatar, rating: poster.rating }
      : null,
  };

  res.json({ success: true, data: result });
});

/* ─────────────────────────────────────────────────────────
   POST /api/tasks
   Create a new task.

   Body: { title, category, budget, location, deadline?, description, postedBy }
   ───────────────────────────────────────────────────────── */
router.post("/", (req, res) => {
  const { title, category, budget, location, deadline, description, postedBy } =
    req.body;

  // ── Validation ──────────────────────────────────────────
  const errors = [];

  if (!title || title.trim().length < 5)
    errors.push("Title must be at least 5 characters.");

  if (!category || !VALID_CATEGORIES.includes(category))
    errors.push("Invalid or missing category.");

  if (!budget || isNaN(budget) || Number(budget) < 1)
    errors.push("Budget must be a positive number.");

  if (!location || location.trim().length < 2)
    errors.push("Location is required.");

  if (!description || description.trim().length < 10)
    errors.push("Description must be at least 10 characters.");

  if (!postedBy)
    errors.push("postedBy (user id) is required.");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // ── Verify user exists ──────────────────────────────────
  const user = db.users.find((u) => u.id === postedBy);
  if (!user) {
    return res.status(400).json({ success: false, message: "User not found." });
  }

  // ── Create task ─────────────────────────────────────────
  const task = {
    id:          db.newId("task-"),
    title:       title.trim(),
    category,
    budget:      Number(budget),
    location:    location.trim(),
    deadline:    deadline || null,
    description: description.trim(),
    status:      "open",
    postedBy,
    acceptedBy:  null,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  db.tasks.unshift(task);

  // Add notification for poster
  db.notifications.unshift({
    id:        db.newId("notif-"),
    userId:    postedBy,
    icon:      "🚀",
    text:      `Your task "${task.title}" is now live!`,
    read:      false,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: task });
});

/* ─────────────────────────────────────────────────────────
   PATCH /api/tasks/:id/accept
   Accept a task.

   Body: { acceptedBy }
   ───────────────────────────────────────────────────────── */
router.patch("/:id/accept", (req, res) => {
  const task = db.tasks.find((t) => t.id === req.params.id);

  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found." });
  }

  if (task.status !== "open") {
    return res.status(400).json({
      success: false,
      message: `Task is already ${task.status}.`,
    });
  }

  const { acceptedBy } = req.body;
  if (!acceptedBy) {
    return res.status(400).json({ success: false, message: "acceptedBy is required." });
  }

  const acceptor = db.users.find((u) => u.id === acceptedBy);
  if (!acceptor) {
    return res.status(400).json({ success: false, message: "User not found." });
  }

  if (task.postedBy === acceptedBy) {
    return res.status(400).json({
      success: false,
      message: "You cannot accept your own task.",
    });
  }

  // Update task
  task.status     = "accepted";
  task.acceptedBy = acceptedBy;
  task.updatedAt  = new Date().toISOString();

  // Notify the task poster
  db.notifications.unshift({
    id:        db.newId("notif-"),
    userId:    task.postedBy,
    icon:      "✅",
    text:      `${acceptor.name} accepted your task "${task.title}".`,
    read:      false,
    createdAt: new Date().toISOString(),
  });

  // Create a conversation between poster and acceptor
  const existingConv = db.conversations.find(
    (c) =>
      c.taskId === task.id &&
      c.participants.includes(task.postedBy) &&
      c.participants.includes(acceptedBy)
  );

  if (!existingConv) {
    db.conversations.push({
      id:           db.newId("conv-"),
      taskId:       task.id,
      participants: [task.postedBy, acceptedBy],
      createdAt:    new Date().toISOString(),
    });
  }

  res.json({ success: true, data: task });
});

/* ─────────────────────────────────────────────────────────
   PATCH /api/tasks/:id/complete
   Mark a task as completed.

   Body: { userId } - must be the acceptor
   ───────────────────────────────────────────────────────── */
router.patch("/:id/complete", (req, res) => {
  const task = db.tasks.find((t) => t.id === req.params.id);

  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found." });
  }

  if (task.status !== "accepted") {
    return res.status(400).json({
      success: false,
      message: "Only accepted tasks can be marked complete.",
    });
  }

  const { userId } = req.body;
  if (task.acceptedBy !== userId && task.postedBy !== userId) {
    return res.status(403).json({
      success: false,
      message: "Only the task poster or acceptor can mark it complete.",
    });
  }

  task.status    = "completed";
  task.updatedAt = new Date().toISOString();

  // Update acceptor's completed count
  const acceptor = db.users.find((u) => u.id === task.acceptedBy);
  if (acceptor) acceptor.tasksCompleted += 1;

  // Notify poster
  db.notifications.unshift({
    id:        db.newId("notif-"),
    userId:    task.postedBy,
    icon:      "🎉",
    text:      `Task "${task.title}" has been completed!`,
    read:      false,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, data: task });
});

/* ─────────────────────────────────────────────────────────
   DELETE /api/tasks/:id
   Delete a task (only by the poster).

   Body: { userId }
   ───────────────────────────────────────────────────────── */
router.delete("/:id", (req, res) => {
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Task not found." });
  }

  const task = db.tasks[idx];
  const { userId } = req.body;

  if (task.postedBy !== userId) {
    return res.status(403).json({
      success: false,
      message: "Only the task poster can delete this task.",
    });
  }

  if (task.status === "accepted") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete a task that has already been accepted.",
    });
  }

  db.tasks.splice(idx, 1);

  res.json({ success: true, message: "Task deleted." });
});

module.exports = router;
