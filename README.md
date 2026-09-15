# SyncSpace

A real-time collaborative Agile workspace — Kanban boards, tasks, comments, documents and
notifications that stay in sync across everyone looking at them.

Frontend and backend are separate folders with their own `.env`, so you only fill in values
and run.

---

## What's inside

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand + Context API, react-beautiful-dnd, React Router, axios |
| Backend | Node.js, Express |
| Real time | Socket.io (JWT-authenticated handshake, workspace / board / card rooms) |
| Database | MongoDB with Mongoose |
| Cache & presence | Redis (ioredis) |
| Auth | JWT + bcrypt |

---

## Run it

You need Node 18+, a MongoDB connection string, and optionally Redis.

### 1. Backend

```bash
cd backend
npm install
# open .env and set MONGO_URI and JWT_SECRET
npm run dev          # http://localhost:5000
```

`backend/.env`:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/syncspace
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

MongoDB Atlas works too — paste the SRV string into `MONGO_URI`.

**Redis is optional.** If it isn't reachable the server prints one line and keeps going;
caching and presence simply turn off. Nothing else breaks.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

`frontend/.env` — the only value you ever change:

```
VITE_API_URL=http://localhost:5000
```

Both the REST calls and the WebSocket connection read this one variable.

### 3. Try the real-time part

Open the app in two browsers (or one normal + one incognito), sign in as two different
people, join the same workspace and open the same board. Drag a card in one window and it
moves in the other. Same for comments, assignments, checklists and typing indicators.

---

## How it fits together

```
backend/
  server.js              HTTP server + Socket.io attached to the same port
  src/app.js             Express app and route mounting
  src/config/            Mongo connection, Redis cache + presence helpers
  src/models/            User, Workspace, Board, List, Card, Comment, Document,
                         Notification, Activity
  src/controllers/       Request handling
  src/routes/            REST endpoints
  src/middleware/        protect (JWT), requireWorkspace, requireRole, errors
  src/services/          Board cache reads, notifications, activity log
  src/sockets/index.js   Handshake auth, rooms, presence

frontend/
  src/lib/               axios client, socket client, SocketContext, helpers
  src/store/             Zustand stores: auth, workspace, board, notifications, ui
  src/components/        Layout, Sidebar, Topbar, CardTile, CardModal, SearchDialog…
  src/pages/             Landing, Login, Register, Workspaces, Dashboard, Boards,
                         BoardPage, MyTasks, Documents, DocumentEditor, Team,
                         Notifications, WorkspaceSettings, Profile
```

### Real-time design

- **Handshake.** The client sends its JWT in `auth.token`. The server verifies it in
  `io.use()` before the connection is accepted — an unauthenticated socket never reaches a
  room.
- **Rooms.** `user:<id>` for personal notifications, `workspace:<id>` for presence and
  activity, `board:<id>` for card and list events, `card:<id>` and `doc:<id>` for typing
  indicators. Joining a workspace or board re-checks membership; a valid token proves who
  you are, not what you're allowed to open.
- **Optimistic updates.** Every mutation changes local state first, then calls the API, and
  rolls back on failure. Broadcasts carry a `by` field so the client that caused the change
  ignores its own echo — no double-applied moves.
- **Cleanup.** Every `socket.on` in a component has a matching `socket.off` in the effect's
  cleanup, so revisiting a board doesn't stack duplicate listeners.
- **Reconnects.** The socket reconnects automatically and re-joins the active workspace room
  on `connect`.

### Where Redis is used

- Caching a board's lists and cards for 60s, invalidated on every board mutation.
- Caching search results for 30s, since the query re-runs as the user types.
- Presence: one Redis set per workspace holding the ids of online users. Presence clears
  only when a user's last tab disconnects.

### Document conflicts

Documents carry a `version` number. The client sends the version it loaded; if the stored
version has moved ahead, the save is rejected with `409` and the editor shows "Out of date"
instead of silently overwriting someone. Incoming remote edits are only painted into the
editor when the caret isn't in it.

---

## API

All routes are under `/api`. Everything except register and login needs
`Authorization: Bearer <token>`. Workspace-scoped routes take `workspaceId` as a query
param or in the body, and are checked by `requireWorkspace`.

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/me` |
| Workspaces | `GET /workspaces`, `POST /workspaces`, `GET|PUT|DELETE /workspaces/:id`, `GET /workspaces/:id/overview`, `GET /workspaces/:id/activity`, `GET /workspaces/:id/my-tasks` |
| Invites | `POST /workspaces/:id/invites`, `GET /workspaces/invites/mine`, `POST /workspaces/:id/invites/accept`, `DELETE /workspaces/:id/members/:userId`, `PUT /workspaces/:id/members/:userId/role` |
| Boards | `GET /boards`, `POST /boards`, `GET|PUT|DELETE /boards/:boardId`, `GET /boards/:boardId/activity` |
| Lists | `POST /lists`, `PUT /lists/reorder`, `PUT|DELETE /lists/:listId` |
| Cards | `POST /cards`, `GET|PUT|DELETE /cards/:cardId`, `PUT /cards/:cardId/move`, `PUT /cards/:cardId/checklist/:itemId` |
| Comments | `GET /comments/card/:cardId`, `POST /comments`, `DELETE /comments/:commentId` |
| Documents | `GET|POST /documents`, `GET|PUT|DELETE /documents/:documentId` |
| Notifications | `GET /notifications`, `PUT /notifications/:id/read`, `POST /notifications/read-all`, `POST /notifications/due-check`, `DELETE /notifications` |
| Search | `GET /search?workspaceId=&q=&priority=&assignee=&status=` |

---

## Notes

- New boards are seeded with Backlog, To Do, In Progress, In Review and Done. Rename,
  reorder or delete them freely.
- A card lands in a list whose name contains "done" and is marked complete automatically.
- Invites: if the email already has an account they join immediately; otherwise the invite
  waits and appears on their workspace screen after they sign up with that address.
- Attachments are stored as name + link. Wire up S3 or Cloudinary if you need real uploads.
- The dark theme is the default; the sun/moon button in the top bar switches to light.
- Due-date reminders are raised when the app loads rather than by a background scheduler —
  add a cron job calling the same logic if you need them without an open tab.
