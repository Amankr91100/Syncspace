# 🚀 SyncSpace

### Real-Time Collaborative Workspace for Modern Teams

SyncSpace is a full-stack collaboration platform that helps teams organize work, manage projects, communicate in real time, and work together from a single workspace.

It provides a centralized environment for managing workspaces, boards, lists, cards, comments, notifications, documents, and search.

---

## 🌐 Live Demo

* **Frontend:** https://syncspace-1-sf6n.onrender.com
* **Backend API:** `https://your-backend-url.onrender.com`

---

## ✨ Features

### 🔐 Authentication

* User registration and login
* Secure authentication
* Protected routes
* User session management

### 🏢 Workspace Management

* Create and manage workspaces
* Organize projects in separate workspaces
* Manage workspace-related activities

### 📋 Project Boards

* Create project boards
* Organize tasks using lists
* Create and manage cards
* Track task progress

### 📝 Task Management

* Add, update, and delete cards
* Add comments to tasks
* Organize tasks inside lists
* Manage project workflow efficiently

### 🔔 Notifications

* Receive workspace-related notifications
* Stay updated about important activities
* Track changes and collaboration events

### 📄 Document Management

* Upload and manage documents
* Organize important project resources
* Access workspace-related documents

### 🔎 Search

* Search across workspace data
* Quickly find boards, cards, documents, and other resources

### ⚡ Real-Time Collaboration

* Real-time communication support
* Live workspace updates using Socket.IO
* Designed for collaborative team workflows

### 📱 Responsive Interface

* Modern and clean user interface
* Responsive layout for desktop and mobile devices
* Easy-to-use workspace experience

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* Tailwind CSS
* Axios
* React Router
* Socket.IO Client

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* Socket.IO
* CORS
* Morgan

### Deployment

* Render
* MongoDB Atlas
* GitHub

---

## 🏗️ Project Architecture

```text
SyncSpace
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── layouts
│   │   ├── lib
│   │   ├── hooks
│   │   └── App.jsx
│   ├── public
│   ├── .env
│   └── package.json
│
├── backend
│   ├── controllers
│   ├── models
│   ├── routes
│   ├── middleware
│   ├── utils
│   ├── app.js
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## ⚙️ Environment Variables

### Frontend

Create a `.env` file inside the `frontend` folder:

```env
VITE_API_URL=http://localhost:5000
```

For production:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

### Backend

Create a `.env` file inside the `backend` folder:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173
```

For production, update:

```env
NODE_ENV=production
CLIENT_URL=https://syncspace-1-sf6n.onrender.com
```

> Never commit your `.env` file or expose secret keys publicly.

---

## 🚀 Getting Started

Follow these steps to run SyncSpace locally.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/syncspace.git
```

```bash
cd syncspace
```

---

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

Start the backend server:

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:5000
```

---

### 3. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

---

## 🔗 API Health Check

You can check whether the backend is running by opening:

```text
http://localhost:5000/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "syncspace-api"
}
```

---

## 🔒 CORS Configuration

The backend uses the frontend URL from the `CLIENT_URL` environment variable.

Example:

```js
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
```

For local development:

```env
CLIENT_URL=http://localhost:5173
```

For production:

```env
CLIENT_URL=https://syncspace-1-sf6n.onrender.com
```

---

## 📡 API Routes

| Module         | Base Route           |
| -------------- | -------------------- |
| Authentication | `/api/auth`          |
| Users          | `/api/users`         |
| Workspaces     | `/api/workspaces`    |
| Boards         | `/api/boards`        |
| Lists          | `/api/lists`         |
| Cards          | `/api/cards`         |
| Comments       | `/api/comments`      |
| Documents      | `/api/documents`     |
| Notifications  | `/api/notifications` |
| Search         | `/api/search`        |
| Health Check   | `/api/health`        |

---

## 🧪 Development Scripts

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

### Backend

```bash
npm run dev
npm start
```

---

## ☁️ Deployment

SyncSpace can be deployed using Render.

### Frontend Deployment

Set the following environment variable in the frontend Render service:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

Then redeploy the frontend.

### Backend Deployment

Set the following environment variables in the backend Render service:

```env
NODE_ENV=production
MONGO_URI=your_mongodb_atlas_url
JWT_SECRET=your_jwt_secret
CLIENT_URL=https://syncspace-1-sf6n.onrender.com
```

After updating environment variables, redeploy the backend.

---

## 🔮 Future Improvements

* Team invitations and role-based permissions
* Drag-and-drop task management
* File preview and document versioning
* Advanced workspace analytics
* Email notifications
* Activity timeline
* Dark mode
* Mobile application
* Improved real-time presence indicators
* Automated testing and CI/CD pipeline

---

## 🤝 Contributing

Contributions are welcome and appreciated.

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature/your-feature
```

3. Make your changes
4. Commit your changes

```bash
git commit -m "Add your feature"
```

5. Push your branch

```bash
git push origin feature/your-feature
```

6. Open a Pull Request

---

## 🐛 Issues and Feedback

If you find a bug or have a feature request, please open an issue in the GitHub repository.

---

## 📄 License

This project is currently available for educational and development purposes.

---

## 👨‍💻 Author

**Aman Kumar**

* GitHub: [Your GitHub Profile](https://github.com/your-username)
* LinkedIn: [Your LinkedIn Profile](https://linkedin.com/in/your-profile)

---

<p align="center">
  Built with ❤️ using React, Node.js, Express, and MongoDB.
</p>
