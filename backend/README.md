# SystemFlow Backend

Node.js/Express REST API with WebSocket support for the SystemFlow architecture simulation platform.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port 27017 (or a MongoDB Atlas URI)

## Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Copy the example env file and fill in your values
cp .env.example .env

# 4. Start the development server (auto-restarts on file changes)
npm run dev

# OR start in production mode
npm start
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port the API server listens on |
| `MONGO_URI` | `mongodb://localhost:27017/systemflow` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | Secret key for signing JWTs — change this! |
| `JWT_EXPIRES_IN` | `7d` | JWT expiry duration |
| `NODE_ENV` | `development` | `development` or `production` |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login and receive JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| POST | `/api/projects` | JWT | Create project |
| GET | `/api/projects` | JWT | List projects (paginated) |
| GET | `/api/projects/:id` | JWT | Get project |
| PUT | `/api/projects/:id` | JWT | Update project |
| DELETE | `/api/projects/:id` | JWT | Delete project |
| POST | `/api/projects/:id/duplicate` | JWT | Duplicate project |
| POST | `/api/simulations` | JWT | Save simulation result |
| GET | `/api/simulations/project/:id` | JWT | Simulation history |
| GET | `/api/simulations/project/:id/stats` | JWT | Aggregate stats |
| GET | `/api/simulations/:id` | JWT | Get simulation |
| DELETE | `/api/simulations/:id` | JWT | Delete simulation |
| POST | `/api/analysis/analyze` | JWT | Analyze topology |
| GET | `/api/analysis/project/:id` | JWT | Analyze project topology |

## WebSocket

Connect to `ws://localhost:4000/ws?token=<JWT>`.

Message types:
- `ping` → server responds with `pong`
- `subscribe_project` with `{ projectId }` → subscribe to project updates
- `unsubscribe_project` with `{ projectId }` → unsubscribe
