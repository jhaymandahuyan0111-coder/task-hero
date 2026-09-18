/* =========================================================
   TASKHERO - USERS ROUTES
   Base: /api/users
   ========================================================= */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

/* ─────────────────────────────────────────────────────────
   HELPER: strip password from user object
   ───────────────────────────────────────────────────────── */
function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

/* ─────────────────────────────────────────────────────────
   GET /api/users
   Returns all users (no passwords).
   ───────────────────────────────────────────────────────── */
router.get("/", (req, res) => {
  res.json({
    success: true,
    count: db.users.length,
    data: db.users.map(safeUser),
  });
});

/* ─────────────────────────────────────────────────────────
   GET /api/users/:id
   Returns a single user by id.
   Includes their posted tasks and accepted tasks.
   ───────────────────────────────────────────────────────── */
router.get("/:id", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const postedTasks   = db.tasks.filter((t) => t.postedBy === user.id);
  const acceptedTasks = db.tasks.filter((t) => t.acceptedBy === user.id);

  res.json({
    success: true,
    data: {
      ...safeUser(user),
      postedTasks,
      acceptedTasks,
    },
  });
});

/* ─────────────────────────────────────────────────────────
   POST /api/users/register
   Create a new user account.

   Body: { name, email, password }
   ───────────────────────────────────────────────────────── */
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  const errors = [];
  if (!name || name.trim().length < 2)
    errors.push("Name must be at least 2 characters.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("A valid email is required.");
  if (!password || password.length < 6)
    errors.push("Password must be at least 6 characters.");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Check duplicate email
  const existing = db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists.",
    });
  }

  const user = {
    id:             db.newId("user-"),
    name:           name.trim(),
    email:          email.toLowerCase().trim(),
    password,       // hash this in production (bcrypt)
    avatar:         name.trim().charAt(0).toUpperCase(),
    rating:         0,
    tasksCompleted: 0,
    joinedAt:       new Date().toISOString(),
  };

  db.users.push(user);

  res.status(201).json({ success: true, data: safeUser(user) });
});

/* ─────────────────────────────────────────────────────────
   POST /api/users/login
   Authenticate a user.

   Body: { email, password }

   NOTE: This is a simplified login — no JWT.
         In production, use JWT or session tokens.
   ───────────────────────────────────────────────────────── */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  res.json({
    success: true,
    message: "Login successful.",
    data: safeUser(user),
  });
});

/* ─────────────────────────────────────────────────────────
   PATCH /api/users/:id
   Update user profile.

   Body: { name?, avatar? }
   ───────────────────────────────────────────────────────── */
router.patch("/:id", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const { name } = req.body;

  if (name && name.trim().length >= 2) {
    user.name   = name.trim();
    user.avatar = name.trim().charAt(0).toUpperCase();
  }

  res.json({ success: true, data: safeUser(user) });
});

module.exports = router;
