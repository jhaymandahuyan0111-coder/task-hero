# TaskHero Backend

Node.js + Express REST API for the TaskHero web app.

## Quick Start

```bash
cd backend
npm install
node server.js
```

Server runs at: **http://localhost:3000**

For auto-restart on file changes:
```bash
npm run dev
```

## API Reference

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (supports `?category=`, `?search=`, `?status=`, `?postedBy=`) |
| GET | `/api/tasks/stats` | Home page stats |
| GET | `/api/tasks/:id` | Get one task |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id/accept` | Accept a task |
| PATCH | `/api/tasks/:id/complete` | Mark as completed |
| DELETE | `/api/tasks/:id` | Delete task |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user + their tasks |
| POST | `/api/users/register` | Register new account |
| POST | `/api/users/login` | Login |
| PATCH | `/api/users/:id` | Update profile |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/conversations/:userId` | Get conversation list |
| GET | `/api/messages/conversations/:userId/:convId` | Get messages in a conversation |
| POST | `/api/messages` | Send a message |
| POST | `/api/messages/conversations` | Start a new conversation |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/:userId` | Get notifications |
| PATCH | `/api/notifications/:userId/read-all` | Mark all as read |
| PATCH | `/api/notifications/:id/read` | Mark one as read |

### Health Check
```
GET /api/health
```

## Example Requests

**Create a task:**
```json
POST /api/tasks
{
  "title": "Help me move a sofa",
  "category": "Moving",
  "budget": 400,
  "location": "BGC, Taguig",
  "deadline": "2026-08-20",
  "description": "Need 2 people to help carry a sofa to the 3rd floor.",
  "postedBy": "user-demo"
}
```

**Accept a task:**
```json
PATCH /api/tasks/task-seed-1/accept
{
  "acceptedBy": "user-demo"
}
```

**Send a message:**
```json
POST /api/messages
{
  "conversationId": "conv-1",
  "senderId": "user-demo",
  "text": "Hi! I'm interested in your task."
}
```

## Notes

- Data is in-memory only. All data resets on server restart.
- To persist data, replace `db.js` with MongoDB, PostgreSQL, or SQLite.
- Passwords are stored in plain text in the demo. Use `bcrypt` in production.
- No authentication middleware (JWT) is included — add it for production.
