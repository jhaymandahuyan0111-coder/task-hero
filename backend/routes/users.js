/* =========================================================
   TASKHERO - USERS ROUTES
   Base: /api/users
   ========================================================= */

const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const db      = require("../db");

/* ─────────────────────────────────────────────────────────
   HELPER: strip password from user object
   ───────────────────────────────────────────────────────── */
function safeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/* ─────────────────────────────────────────────────────────
   GET /api/users
   Returns all users (no passwords).
   ───────────────────────────────────────────────────────── */
router.get("/", (req, res) => {
  const users = db.users.findAll();
  res.json({
    success: true,
    count: users.length,
    data: users.map(safeUser),
  });
});

/* ─────────────────────────────────────────────────────────
   GET /api/users/search?q=<term>
   Search users by name (case-insensitive substring match).
   Returns up to 10 results with id, name, avatar, tagline,
   location, rating, tasksCompleted.
   ───────────────────────────────────────────────────────── */
router.get("/search", (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();

  if (!q) {
    return res.json({ success: true, count: 0, data: [] });
  }

  const all = db.users.findAll();
  const matches = all
    .filter((u) => u.name.toLowerCase().includes(q))
    .slice(0, 10)
    .map((u) => ({
      id:             u.id,
      name:           u.name,
      avatar:         u.avatar,
      tagline:        u.tagline,
      location:       u.location,
      rating:         u.rating,
      tasksCompleted: u.tasksCompleted,
    }));

  res.json({ success: true, count: matches.length, data: matches });
});

/* ─────────────────────────────────────────────────────────
   GET /api/users/:id
   Returns a single user by id.
   Includes their posted tasks and accepted tasks.
   ───────────────────────────────────────────────────────── */
router.get("/:id", (req, res) => {
  const user = db.users.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const postedTasks   = db.tasks.findAll({ postedBy: user.id });
  const acceptedTasks = db.tasks.findAll({ acceptedBy: user.id });

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
  const existing = db.users.findByEmail(email);
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
    password:       bcrypt.hashSync(password, 10),
    avatar:         name.trim().charAt(0).toUpperCase(),
    bio:            "",
    tagline:        "",
    location:       "",
    skills:         [],
    expertise:      [],
    certs:          [],
    portfolio:      [],
    workExp:        [],
    contact:        {},
    rating:         0,
    tasksCompleted: 0,
    joinedAt:       new Date().toISOString(),
  };

  const created = db.users.create(user);

  res.status(201).json({ success: true, data: safeUser(created) });
});

/* ─────────────────────────────────────────────────────────
   POST /api/users/google
   Sign in or register via Google Identity Services.

   Body: { name, email, googleId, avatar }
     - name     : display name from Google profile
     - email    : verified Google email
     - googleId : Google "sub" claim (unique per user per app)
     - avatar   : profile picture URL (optional)

   Behaviour:
     - Existing email → return that user (no password check)
     - New email      → create account with a locked password
   ───────────────────────────────────────────────────────── */
router.post("/google", (req, res) => {
  const { name, email, googleId, avatar } = req.body;

  if (!email || !googleId) {
    return res.status(400).json({
      success: false,
      message: "email and googleId are required.",
    });
  }

  // Return existing account for this email
  const existing = db.users.findByEmail(email);
  if (existing) {
    // Optionally keep avatar in sync with Google photo
    if (avatar && avatar !== existing.avatar) {
      db.users.update(existing.id, { avatar });
    }
    return res.json({ success: true, data: safeUser(db.users.findById(existing.id)) });
  }

  // Create new account — password is a long random hash (can never be used for login)
  const displayName = (name || email.split("@")[0]).trim();
  const user = {
    id:             db.newId("user-"),
    name:           displayName,
    email:          email.toLowerCase().trim(),
    password:       bcrypt.hashSync(googleId + (process.env.GOOGLE_PW_SALT || "taskhero-google"), 10),
    avatar:         avatar || displayName.charAt(0).toUpperCase(),
    bio:            "",
    tagline:        "",
    location:       "",
    skills:         [],
    expertise:      [],
    certs:          [],
    portfolio:      [],
    workExp:        [],
    contact:        { email: email.toLowerCase().trim() },
    rating:         0,
    tasksCompleted: 0,
    joinedAt:       new Date().toISOString(),
  };

  const created = db.users.create(user);
  return res.status(201).json({ success: true, data: safeUser(created) });
});

/* ─────────────────────────────────────────────────────────
   POST /api/users/login
   Authenticate a user.

   Body: { email, password }
   ───────────────────────────────────────────────────────── */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  const user = db.users.findByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
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

   Body: { name?, tagline?, location?, bio?, avatar?,
           skills?, expertise?, certs?, portfolio?,
           workExp?, contact?, banner? }
   ───────────────────────────────────────────────────────── */
router.patch("/:id", (req, res) => {
  const user = db.users.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const {
    name, tagline, location, bio, avatar,
    skills, expertise, certs, portfolio, workExp, contact, banner,
  } = req.body;

  const fields = {};
  if (name      !== undefined) fields.name      = name.trim();
  if (tagline   !== undefined) fields.tagline   = tagline;
  if (location  !== undefined) fields.location  = location;
  if (bio       !== undefined) fields.bio       = bio;
  if (avatar    !== undefined) fields.avatar    = avatar;
  if (skills    !== undefined) fields.skills    = skills;
  if (expertise !== undefined) fields.expertise = expertise;
  if (certs     !== undefined) fields.certs     = certs;
  if (portfolio !== undefined) fields.portfolio = portfolio;
  if (workExp   !== undefined) fields.workExp   = workExp;
  if (contact   !== undefined) fields.contact   = contact;
  if (banner    !== undefined) fields.banner    = banner;

  const updated = db.users.update(req.params.id, fields);

  res.json({ success: true, data: safeUser(updated) });
});

module.exports = router;
