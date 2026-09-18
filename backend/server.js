/* =========================================================
   TASKHERO - EXPRESS SERVER
   =========================================================

   Start:       node server.js
   Dev (watch): npm run dev   (requires nodemon)

   API Base:    http://localhost:3000/api

   Endpoints:
   ─────────────────────────────────────────────────────────
   TASKS
     GET    /api/tasks                       List / search tasks
     GET    /api/tasks/stats                 Home page stats
     GET    /api/tasks/:id                   Get one task
     POST   /api/tasks                       Create task
     PATCH  /api/tasks/:id/accept            Accept task
     PATCH  /api/tasks/:id/complete          Mark complete
     DELETE /api/tasks/:id                   Delete task

   USERS
     GET    /api/users                       List users
     GET    /api/users/:id                   Get one user (+ tasks)
     POST   /api/users/register              Register
     POST   /api/users/login                 Login
     PATCH  /api/users/:id                   Update profile

   MESSAGES
     GET    /api/messages/conversations/:uid        Conversation list
     GET    /api/messages/conversations/:uid/:cid   Messages in conversation
     POST   /api/messages                           Send message
     POST   /api/messages/conversations             Start conversation

   NOTIFICATIONS
     GET    /api/notifications/:userId              Get notifications
     PATCH  /api/notifications/:userId/read-all     Mark all read
     PATCH  /api/notifications/:id/read             Mark one read
   ========================================================= */

const express       = require("express");
const cors          = require("cors");
const path          = require("path");

const taskRoutes         = require("./routes/tasks");
const userRoutes         = require("./routes/users");
const messageRoutes      = require("./routes/messages");
const notificationRoutes = require("./routes/notifications");

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─────────────────────────────────────────────────────────
   MIDDLEWARE
   ───────────────────────────────────────────────────────── */

// CORS — allows the frontend (opened via file:// or localhost) to call the API
app.use(cors({
  origin: ["http://localhost:5500", "http://127.0.0.1:5500", "null"],
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Parse JSON request bodies
app.use(express.json());

// Serve the frontend from the parent directory
app.use(express.static(path.join(__dirname, "..")));

/* ─────────────────────────────────────────────────────────
   REQUEST LOGGER
   ───────────────────────────────────────────────────────── */
app.use((req, res, next) => {
  const now = new Date().toLocaleTimeString();
  console.log(`[${now}]  ${req.method.padEnd(7)} ${req.path}`);
  next();
});

/* ─────────────────────────────────────────────────────────
   API ROUTES
   ───────────────────────────────────────────────────────── */
app.use("/api/tasks",         taskRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/notifications", notificationRoutes);

/* ─────────────────────────────────────────────────────────
   HEALTH CHECK
   ───────────────────────────────────────────────────────── */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TaskHero API is running.",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

/* ─────────────────────────────────────────────────────────
   SERVE FRONTEND - catch-all
   Any non-API route serves home.html
   ───────────────────────────────────────────────────────── */
app.get("*", (req, res) => {
  // Only serve HTML for non-API routes
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "..", "home.html"));
  } else {
    res.status(404).json({ success: false, message: "API route not found." });
  }
});

/* ─────────────────────────────────────────────────────────
   GLOBAL ERROR HANDLER
   ───────────────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({
    success: false,
    message: "Internal server error.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

/* ─────────────────────────────────────────────────────────
   START SERVER
   ───────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log("");
  console.log("  🚀  TaskHero API is running!");
  console.log("  ─────────────────────────────────────────");
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  API:     http://localhost:${PORT}/api/tasks`);
  console.log(`  Health:  http://localhost:${PORT}/api/health`);
  console.log("  ─────────────────────────────────────────");
  console.log("  Press Ctrl+C to stop.\n");
});
