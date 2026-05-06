# SystemFlow

SystemFlow is a visual system-design simulator for distributed architectures.

It is like a mix of Figma for architecture diagrams, a ReactFlow canvas, a load-testing simulator, and a system-design advisor. You can design a backend or cloud architecture, configure how each part behaves, and then pressure-test the system visually before building it for real.

## What It Does

SystemFlow lets users:

- Drag and drop architecture nodes such as users, API gateways, load balancers, services, databases, queues, caches, CDNs, cloud services, security tools, and observability tools.
- Connect nodes into a full distributed-system topology.
- Configure each node's latency, capacity, failure rate, timeout, retries, queue size, cache hit rate, and related runtime behavior.
- Run simulated traffic through the architecture.
- Watch live metrics such as latency, throughput, error rate, overloaded nodes, failed requests, request paths, and bottlenecks.
- Load production-style templates for systems like e-commerce, real-time chat, video streaming, fintech, gaming backends, IoT pipelines, SaaS platforms, and search engines.
- Run stress tests, spike tests, chaos tests, SLA validation, failover tests, and other traffic scenarios.
- Use the architecture advisor to reason about reliability, scalability, cost, bottlenecks, and missing infrastructure pieces.

## Simple Pitch

SystemFlow helps you design a backend or cloud architecture and then visually pressure-test it before building it for real.

It can be used for system-design learning, engineering demos, interview preparation, architecture planning, and showing why a design breaks under load.

## Current Shape

The project currently has:

- A Next.js frontend with a visual ReactFlow canvas.
- A client-side simulation engine for traffic, latency, failures, retries, queues, caches, circuit breakers, and overload behavior.
- Built-in architecture templates and node presets.
- Local browser-based authentication and saved canvas state.
- An Express backend with SQLite support for users, projects, simulations, analysis routes, and WebSocket support.

The frontend is the most complete part of the app today. The backend exists, but the active UI is still mostly wired to browser-local state rather than the backend API.

## Tech Stack

- Next.js
- React
- TypeScript
- ReactFlow
- Zustand
- Recharts
- Framer Motion
- Express
- SQLite via `better-sqlite3`
- WebSockets

## Getting Started

Install frontend dependencies:

```bash
npm install
```

Run the frontend development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build the frontend:

```bash
npm run build
```

## Backend

The backend lives in `backend/`.

Install backend dependencies:

```bash
cd backend
npm install
```

Run the backend:

```bash
npm run dev
```

By default, the backend listens on:

```text
http://localhost:4000
```

## Useful Scripts

Frontend:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Backend:

```bash
cd backend
npm run dev
npm start
```
