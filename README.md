# TaskFlow — Project & Task Management

A full-stack task management application with role-based access control, built with **Node.js/Express + SQLite** (backend) and **React + Vite** (frontend).

> 🚀 **Live Demo**: https://your-taskflow.railway.app  
> 🔑 **Demo credentials**: admin@taskflow.com / admin123

---

## Features

### Authentication
- JWT-based signup/login with bcrypt password hashing
- Role assignment at registration (Admin / Member)
- Token refresh and persistent sessions

### Project & Team Management
- Create, edit, archive, and delete projects
- Add/remove team members with per-project roles (Project Admin / Member)
- Global admins can see and manage all projects

### Task Management
- Full CRUD for tasks with title, description, status, priority, due date, assignee
- Inline status updates (Kanban-style column view)
- Task filtering by status and priority
- Task comments
- Overdue detection with visual indicators

### Dashboard
- Aggregated task stats (total, in progress, done, overdue)
- My Tasks view with status tracking
- Project progress bars
- Recent activity feed

### Role-Based Access Control
| Action | Admin | Project Admin | Member |
|--------|-------|---------------|--------|
| Create project | ✅ | ✅ | ✅ |
| Delete any project | ✅ | ❌ | ❌ |
| Add project members | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ✅ |
| Edit any task | ✅ | ✅ | Own only |
| Delete task | ✅ | ✅ | Own only |
| View admin panel | ✅ | ❌ | ❌ |

---

## Tech Stack

**Backend**
- Node.js + Express
- SQLite (via better-sqlite3) — portable, zero-config
- JWT + bcryptjs for auth
- express-validator, helmet, morgan, express-rate-limit

**Frontend**
- React 18 + Vite
- React Router v6
- Axios
- Tailwind CSS
- Lucide Icons
- date-fns

---

## Local Development

### Prerequisites
- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit: set a strong JWT_SECRET

# Frontend
cp frontend/.env.example frontend/.env
# Default: VITE_API_URL=/api (proxied via Vite)
```

### 3. Run development servers

Terminal 1 (Backend):
```bash
cd backend
npm run dev
# API at http://localhost:3001
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# App at http://localhost:5173
```

### 4. Seed demo data (optional)

```bash
cd backend
node src/db/seed.js
# Creates: admin@taskflow.com / admin123
#          member@taskflow.com / member123
```

---

## Deployment (Railway)

This app deploys as **two services** on Railway — one for the API, one for the frontend.

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Step 2: Deploy Backend

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo → **Set Root Directory to `backend`**
3. Add environment variables:
   ```
   JWT_SECRET=your-random-32-char-secret-here
   DB_PATH=/app/data/taskflow.db
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.railway.app
   SEED_DEMO_DATA=true
   ```
4. Add a Railway Volume mounted at `/app/data` so SQLite persists across redeploys
5. Railway uses `backend/railway.json` to run `npm ci --omit=dev` and `npm start`
6. Copy the generated URL (e.g., `https://taskflow-backend.railway.app`)

### Step 3: Deploy Frontend

1. New Service → Deploy from same GitHub repo
2. **Set Root Directory to `frontend`**
3. Add environment variables:
   ```
   VITE_API_URL=https://taskflow-backend.railway.app/api
   ```
4. Railway uses `frontend/railway.json` to run `npm ci && npm run build`
5. Start command is already configured as `npm run start -- --port $PORT`

### Step 4: Test

Update backend `FRONTEND_URL` with the deployed frontend URL, redeploy the backend once, then visit your frontend Railway URL.

Demo credentials are available when `SEED_DEMO_DATA=true`:

```
admin@taskflow.com / admin123
member@taskflow.com / member123
```

For a concise checklist, see [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md).

---

## API Reference

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/signup` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Auth | Get current user |
| GET | `/api/auth/users` | Auth | List all users |

### Projects
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/projects` | Auth | List my projects |
| POST | `/api/projects` | Auth | Create project |
| GET | `/api/projects/:id` | Member | Get project details |
| PUT | `/api/projects/:id` | Project Admin | Update project |
| DELETE | `/api/projects/:id` | Project Admin | Delete project |
| POST | `/api/projects/:id/members` | Project Admin | Add member |
| DELETE | `/api/projects/:id/members/:uid` | Project Admin | Remove member |

### Tasks
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/projects/:pid/tasks` | Member | List tasks (filterable) |
| POST | `/api/projects/:pid/tasks` | Member | Create task |
| GET | `/api/projects/:pid/tasks/:tid` | Member | Get task + comments |
| PUT | `/api/projects/:pid/tasks/:tid` | Member/Owner | Update task |
| DELETE | `/api/projects/:pid/tasks/:tid` | Owner/Admin | Delete task |
| POST | `/api/projects/:pid/tasks/:tid/comments` | Member | Add comment |

### Dashboard
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/dashboard` | Auth | Get aggregated stats |

---

## Database Schema

```sql
users (id, name, email, password_hash, role, avatar_initials, created_at)
projects (id, name, description, status, owner_id, created_at)
project_members (id, project_id, user_id, role, joined_at)
tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, created_at)
task_comments (id, task_id, user_id, content, created_at)
```

---

## Project Structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.js       # DB connection
│   │   │   └── migrate.js     # Schema + migrations
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT + RBAC middleware
│   │   ├── routes/
│   │   │   ├── auth.js        # Auth endpoints
│   │   │   ├── projects.js    # Project endpoints
│   │   │   ├── tasks.js       # Task endpoints
│   │   │   └── dashboard.js   # Dashboard stats
│   │   └── index.js           # Express app entry
│   ├── railway.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/           # React Context (Auth)
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level pages
│   │   ├── layouts/           # Layout wrappers
│   │   ├── api.js             # Axios API client
│   │   └── main.jsx           # Entry point
│   ├── railway.json
│   └── package.json
└── README.md
```

---

## License

MIT
