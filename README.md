```
███████╗██╗      ██████╗ ██╗    ██╗██████╗  █████╗
██╔════╝██║     ██╔═══██╗██║    ██║██╔══██╗██╔══██╗
█████╗  ██║     ██║   ██║██║ █╗ ██║██████╔╝███████║
██╔══╝  ██║     ██║   ██║██║███╗██║██╔══██╗██╔══██║
██║     ███████╗╚██████╔╝╚███╔███╔╝██║  ██║██║  ██║
╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝
```

> **Design distributed systems visually. Simulate chaos. Ship with confidence.**

---

## What is Flowra?

Flowra is a distributed systems design and simulation platform. Think **Figma for architecture diagrams** — but the canvas runs your system, breaks it, and tells you what will fail in production before you ship.

You drag nodes. You wire topology. You fire synthetic traffic. You watch it break.

Then you fix it.

---

## Core Capabilities

| Capability | What it does |
|---|---|
| **Visual Canvas** | 108 node types — databases, queues, AI endpoints, service meshes, CDNs, load balancers |
| **Simulation Engine** | Up to 1M synthetic req/sec, real-time latency + throughput metrics |
| **Chaos Testing** | 12 scenarios — node failures, network partitions, traffic spikes, cold starts |
| **AI Advisor** | Continuous topology analysis — flags SPOFs, over-provisioned paths, bottlenecks |
| **Precision Models** | DB replication lag, cache eviction pressure, queue backpressure, autoscale latency |
| **Architecture Templates** | E-commerce, real-time chat, fintech, gaming, IoT, SaaS, video streaming, search |

---

## Stack

```
Frontend          Backend           Infra
─────────         ────────          ─────
Next.js 16        Express           SQLite (better-sqlite3)
React 19          WebSockets        JWT auth
TypeScript        REST API          bcrypt
ReactFlow                           nodemailer
Zustand
Recharts
Framer Motion
Three.js          Landing
                  ────────
                  Custom HTML/CSS/JS
                  Three.js network topology
                  CommitMono typeface
```

---

## Get Running

**One command — runs frontend + backend concurrently:**

```bash
npm install
npm run go
```

| Service | URL |
|---|---|
| Landing page | `http://localhost:3000` |
| App canvas | `http://localhost:3000/SystemFlow.html` |
| API | `http://localhost:4000` |

---

**Or run separately:**

```bash
# Frontend only
npm run dev

# Backend only
npm run backend

# Build
npm run build
```

---

## Project Structure

```
flowra/
├── app/                    Next.js app router
├── public/
│   ├── SystemFlow.html     Main app shell
│   ├── canvas.jsx          ReactFlow canvas + pan/zoom
│   ├── simulation.jsx      Traffic simulation engine
│   ├── store.jsx           Global state (Zustand-like)
│   ├── left-panel.jsx      Node palette (108 types)
│   ├── right-panel.jsx     Config + metrics + collab
│   ├── bottom-panel.jsx    Scenario runner + logs
│   ├── header.jsx          Top bar + export
│   ├── modals.jsx          Onboarding + pro upgrade
│   ├── data.jsx            Node definitions + icons
│   ├── api.js              API client (JWT-aware)
│   ├── login.html          Auth — Three.js split layout
│   └── register.html       Auth — Three.js split layout
├── backend/
│   ├── server.js           Express + WebSocket
│   ├── routes/             auth, projects, simulations
│   └── data/               SQLite db files (gitignored)
├── Flowra/
│   └── index.html          Landing page (Three.js)
└── next.config.ts          Redirects / → /landing.html
```

---

## Auth Flow

```
localhost:3000
    │
    ▼  307 redirect
/landing.html  (Three.js landing)
    │
    ▼  GET STARTED
/login.html or /register.html
    │
    ▼  POST localhost:4000/api/auth/*
/SystemFlow.html  (main canvas app)
```

Falls back to `localStorage` auth if backend is down.

---

## Environment

```bash
# backend/.env (create this)
PORT=4000
JWT_SECRET=your_secret_here
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
```

---

## Scripts

```bash
npm run go          # start everything (frontend + backend)
npm run dev         # Next.js dev server only
npm run backend     # Express backend only
npm run build       # production build
npm run lint        # ESLint
```

---

## Status

> Alpha. Canvas and simulation engine are production-quality. Backend API is partially wired — most state lives client-side today. Auth, project persistence, and WebSocket collab are in progress.

---

<div align="center">

**Built for engineers who want to know their system won't fail before they ship it.**

[Get Started](http://localhost:3000) · [Log In](http://localhost:3000/login.html)

</div>
