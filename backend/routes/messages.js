/* =========================================================
   TASKHERO - MESSAGES ROUTES
   Base: /api/messages
   ========================================================= */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

/* ─────────────────────────────────────────────────────────
   GET /api/messages/conversations/:userId
   Returns all conversations for a given user,
   with the last message and unread count attached.
   ───────────────────────────────────────────────────────── */
router.get("/conversations/:userId", (req, res) => {
  const { userId } = req.params;

  const userConvos = db.conversations.filter((c) =>
    c.participants.includes(userId)
  );

  const result = userConvos.map((conv) => {
    // Messages in this conversation
    const convMessages = db.messages
      .filter((m) => m.conversationId === conv.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const lastMsg  = convMessages.at(-1) || null;
    const unread   = convMessages.filter(
      (m) => m.senderId !== userId && !m.read
    ).length;

    // Get the other participant's info
    const otherId = conv.participants.find((p) => p !== userId);
    const other   = db.users.find((u) => u.id === otherId);

    // Get the related task
    const task = db.tasks.find((t) => t.id === conv.taskId);

    return {
      conversationId: conv.id,
      taskId:         conv.taskId,
      taskTitle:      task ? task.title : "Direct conversation",
      taskBudget:     task ? task.budget : 0,
      participant: other
        ? { id: other.id, name: other.name, avatar: other.avatar }
        : { id: otherId, name: "Unknown", avatar: "?" },
      lastMessage:    lastMsg ? lastMsg.text : null,
      lastMessageAt:  lastMsg ? lastMsg.createdAt : conv.createdAt,
      unread,
    };
  });

  // Sort by most recent message
  result.sort(
    (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
  );

  res.json({ success: true, count: result.length, data: result });
});

/* ─────────────────────────────────────────────────────────
   GET /api/messages/conversations/:userId/:conversationId
   Returns all messages in a conversation.
   Also marks messages as read.
   ───────────────────────────────────────────────────────── */
router.get("/conversations/:userId/:conversationId", (req, res) => {
  const { userId, conversationId } = req.params;

  const conv = db.conversations.find((c) => c.id === conversationId);

  if (!conv) {
    return res.status(404).json({ success: false, message: "Conversation not found." });
  }

  if (!conv.participants.includes(userId)) {
    return res.status(403).json({
      success: false,
      message: "You are not a participant in this conversation.",
    });
  }

  // Get messages and mark them as read
  const convMessages = db.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  convMessages.forEach((m) => {
    if (m.senderId !== userId) m.read = true;
  });

  // Attach sender name to each message
  const withSender = convMessages.map((m) => {
    const sender = db.users.find((u) => u.id === m.senderId);
    return {
      ...m,
      senderName:   sender ? sender.name : "Unknown",
      senderAvatar: sender ? sender.avatar : "?",
      isMe:         m.senderId === userId,
    };
  });

  res.json({ success: true, count: withSender.length, data: withSender });
});

/* ─────────────────────────────────────────────────────────
   POST /api/messages
   Send a new message.

   Body: { conversationId, senderId, text }
   ───────────────────────────────────────────────────────── */
router.post("/", (req, res) => {
  const { conversationId, senderId, text } = req.body;

  // Validation
  if (!conversationId || !senderId || !text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: "conversationId, senderId, and text are required.",
    });
  }

  // Check conversation exists
  const conv = db.conversations.find((c) => c.id === conversationId);
  if (!conv) {
    return res.status(404).json({ success: false, message: "Conversation not found." });
  }

  // Check sender is a participant
  if (!conv.participants.includes(senderId)) {
    return res.status(403).json({
      success: false,
      message: "You are not a participant in this conversation.",
    });
  }

  // Check sender exists
  const sender = db.users.find((u) => u.id === senderId);
  if (!sender) {
    return res.status(400).json({ success: false, message: "Sender not found." });
  }

  const message = {
    id:             db.newId("msg-"),
    conversationId,
    senderId,
    text:           text.trim(),
    read:           false,
    createdAt:      new Date().toISOString(),
  };

  db.messages.push(message);

  // Notify the other participant
  const recipientId = conv.participants.find((p) => p !== senderId);
  if (recipientId) {
    const task = db.tasks.find((t) => t.id === conv.taskId);
    db.notifications.unshift({
      id:        db.newId("notif-"),
      userId:    recipientId,
      icon:      "💬",
      text:      `${sender.name} sent you a message${task ? ` about "${task.title}"` : ""}.`,
      read:      false,
      createdAt: new Date().toISOString(),
    });
  }

  res.status(201).json({
    success: true,
    data: {
      ...message,
      senderName:   sender.name,
      senderAvatar: sender.avatar,
      isMe:         true,
    },
  });
});

/* ─────────────────────────────────────────────────────────
   POST /api/messages/conversations
   Start a new conversation.

   Body: { taskId, initiatorId, recipientId }
   ───────────────────────────────────────────────────────── */
router.post("/conversations", (req, res) => {
  const { taskId, initiatorId, recipientId } = req.body;

  if (!initiatorId || !recipientId) {
    return res.status(400).json({
      success: false,
      message: "initiatorId and recipientId are required.",
    });
  }

  if (initiatorId === recipientId) {
    return res.status(400).json({
      success: false,
      message: "Cannot start a conversation with yourself.",
    });
  }

  // A task is optional for direct user conversations.
  const task = taskId ? db.tasks.find((t) => t.id === taskId) : null;
  if (taskId && !task) {
    return res.status(404).json({ success: false, message: "Task not found." });
  }

  // Check both users exist
  const initiator = db.users.find((u) => u.id === initiatorId);
  const recipient = db.users.find((u) => u.id === recipientId);
  if (!initiator || !recipient) {
    return res.status(400).json({ success: false, message: "One or both users not found." });
  }

  // Check if conversation already exists for this task + pair
  const existing = db.conversations.find(
    (c) =>
      c.taskId === (taskId || null) &&
      c.participants.includes(initiatorId) &&
      c.participants.includes(recipientId)
  );

  if (existing) {
    return res.json({ success: true, data: existing, existing: true });
  }

  const conv = {
    id:           db.newId("conv-"),
    taskId,
    participants: [initiatorId, recipientId],
    createdAt:    new Date().toISOString(),
  };

  db.conversations.push(conv);

  res.status(201).json({ success: true, data: conv });
});

module.exports = router;
