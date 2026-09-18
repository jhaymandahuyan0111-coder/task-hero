/* In-memory store for the running development server. Data resets on restart. */

const { v4: uuid } = require("uuid");

const users = [];
const tasks = [];
const conversations = [];
const messages = [];
const notifications = [];

function newId(prefix = "") {
  return prefix + uuid();
}

module.exports = {
  users,
  tasks,
  conversations,
  messages,
  notifications,
  newId,
};
