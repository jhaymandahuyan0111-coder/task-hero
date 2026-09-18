/* =========================================================
   TASKHERO - NOTIFICATIONS ROUTES
   Base: /api/notifications
   ========================================================= */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

/* ─────────────────────────────────────────────────────────
   GET /api/notifications/:userId
   Returns all notifications for a user, newest first.
   ───────────────────────────────────────────────────────── */
router.get("/:userId", (req, res) => {
  const { userId } = req.params;

  const userNotifs = db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = userNotifs.filter((n) => !n.read).length;

  res.json({
    success: true,
    unreadCount,
    count: userNotifs.length,
    data: userNotifs,
  });
});

/* ─────────────────────────────────────────────────────────
   PATCH /api/notifications/:userId/read-all
   Marks all notifications as read for a user.
   ───────────────────────────────────────────────────────── */
router.patch("/:userId/read-all", (req, res) => {
  const { userId } = req.params;

  db.notifications
    .filter((n) => n.userId === userId)
    .forEach((n) => (n.read = true));

  res.json({ success: true, message: "All notifications marked as read." });
});

/* ─────────────────────────────────────────────────────────
   PATCH /api/notifications/:id/read
   Marks a single notification as read.
   ───────────────────────────────────────────────────────── */
router.patch("/:id/read", (req, res) => {
  const notif = db.notifications.find((n) => n.id === req.params.id);

  if (!notif) {
    return res.status(404).json({ success: false, message: "Notification not found." });
  }

  notif.read = true;

  res.json({ success: true, data: notif });
});

module.exports = router;
