# SystemFlow — Investor Pitch Document

> **Visual Distributed Systems Simulator**
> Design, configure, and pressure-test backend architectures before writing a single line of code.

---

## Executive Summary

SystemFlow is a browser-based sandbox where engineers drag-and-drop distributed system components onto a canvas, wire them into real architectures, configure production-realistic parameters, and run simulated traffic to watch failures happen in real time — before those failures happen in production.

Think Figma for backend architecture, crossed with a load tester, crossed with an architecture health advisor.

**Target users:** Software engineers, system design students, DevOps/SRE teams, engineering managers, tech interview prep learners.

---

## The Problem

Distributed system failures are expensive and preventable.

- Engineers design architectures on whiteboards or in Confluence docs with no way to validate behavior under load.
- System design interviews require candidates to reason about capacity, failure modes, and bottlenecks — with zero tooling support.
- Junior engineers have no safe sandbox to develop distributed systems intuition.
- Architecture reviews happen too late — after code is written.

**Existing tools fail:**
| Tool | Gap |
|------|-----|
| draw.io / Lucidchart | Static diagrams, no simulation |
| AWS Architecture Diagrams | Cloud-vendor locked, no behavior modeling |
| k6 / Locust | Real infra required, no visual architecture editor |
| Excalidraw | Whiteboard only, no config or metrics |

No tool combines visual design + behavioral simulation + architecture guidance in one place.

---

## The Solution

SystemFlow closes this gap with three integrated layers:

1. **Visual Canvas** — drag-and-drop 141+ node types across AWS, GCP, Azure, and generic categories. Connect them into real topologies.
2. **Simulation Engine** — configure per-node latency, capacity, failure rate, circuit breakers, retry policies, queue limits. Run traffic and watch the system behave.
3. **Architecture Advisor** — automated analysis detects SPOFs, missing redundancy, absent observability, and provides a health score with actionable improvements.

---

## Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Canvas | ReactFlow (node/edge graph rendering) |
| State | Zustand (canvas state, simulation state, auth) |
| Charts | Recharts (time-series metrics dashboard) |
| Animation | Framer Motion (animated request flows on edges) |
| Styling | Tailwind CSS |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (RS256-style with bcrypt password hashing) |
| Real-time | WebSocket (`ws` library) |
| Security | Helmet, CORS, rate limiting middleware |

### Simulation Engine
- Pure TypeScript, client-side, ~1,028 lines
- Event-driven loop with configurable tick rate
- No external dependencies — runs entirely in the browser

---

## Core Simulation Algorithm

The simulation engine is the technical heart of SystemFlow. It is an **event-driven discrete-time simulator** that models distributed request flow with production-realistic failure mechanics.

### How It Works

```
TrafficGenerator → RequestQueue → NodeProcessor → PathRouter → MetricsCollector
```

**1. Traffic Generation**
Generates synthetic requests at a configurable rate using five traffic patterns:
- `constant` — steady RPS baseline
- `ramp` — linearly increasing load until cap
- `spike` — sudden burst then drop
- `wave` — sinusoidal oscillation
- `step` — stepped increments

**2. Request Path Routing**
Each request follows the DAG of connected nodes (graph adjacency list built from ReactFlow edges). Requests are routed hop-by-hop through the topology in order.

**3. Per-Node Processing Model**
At each node, the engine applies:

```
effective_latency = base_processing_time
                  × (1 + load_factor × (current_load / max_capacity))
                  + tls_overhead
```

With failure injection:
```
if (random() < failure_rate / 100) → request fails at this node
if (current_load > max_capacity)   → request enters queue
if (queue_size > queue_limit)      → request dropped (queue overflow)
```

**4. Specialized Node Behaviors**

| Node Class | Behavior |
|-----------|---------|
| Cache nodes | `cache_hit_rate`% requests return immediately (skip downstream) |
| Queue/Kafka nodes | Async buffering — request held, processed at queue throughput rate |
| Load Balancer | Round-robin distribution across downstream nodes |
| Rate Limiter | Hard cap on `allowed_rps`; excess requests rejected |
| Circuit Breaker | Tracks failure window; opens after `threshold`% failures; half-open recovery after `timeout_ms` |
| CDN nodes | Cache hit serves immediately; miss passes through to origin |
| Firewall/WAF | `block_rate`% of requests dropped before reaching backend |

**5. Circuit Breaker State Machine**
```
CLOSED → (failure rate > threshold) → OPEN
OPEN   → (timeout elapsed)          → HALF-OPEN
HALF-OPEN → (request success)       → CLOSED
HALF-OPEN → (request failure)       → OPEN
```

**6. Metrics Collection**
Every tick:
- Per-node: requests handled, failed, avg latency, peak load, queue depth, dropped requests, throughput, error rate
- System-wide: total/completed/failed requests, p50/p95/p99 latency, throughput RPS, error rate %, health score
- Time-series: sampled every N ticks for Recharts dashboard

**7. Architecture Health Scoring**
Static analysis runs over the current topology at any time:

| Check | Points |
|-------|--------|
| CDN present | +10 |
| Load balancer present | +10 |
| Circuit breaker present | +10 |
| Cache layer present | +10 |
| Message queue present | +10 |
| No SPOF detected | +10 |
| Observability stack present | +10 |
| Multiple DB instances | +10 |
| Rate limiting present | +5 |
| WAF present | +5 |

Grade: A+(90+) → A(80) → B(70) → C(60) → D(40) → F

**8. SLA Estimation**
Multiplicative availability model:
```
availability = ∏(1 - failure_rate_i / 100) for all nodes i
SLA = availability × 100%
→ maps to N-nines label (99.9% = 3 nines, etc.)
```

**9. Cost Estimation**
Heuristic monthly cost model per node category:
- Compute: $50 + (capacity_scale × $50)
- Database: $100 + (capacity_scale × $100)
- CDN/LB: $20 flat
- Queue: $40 flat
- Monitoring: $30 flat

---

## Node Registry — 141+ Node Types

13 categories with realistic defaults, colors, and behavior parameters:

| Category | Example Nodes |
|----------|--------------|
| Clients | Browser, Mobile App, IoT Device, Bot |
| Network | Load Balancer, CDN, API Gateway, DNS, Reverse Proxy |
| Compute | Microservice, Serverless Lambda, Kubernetes Pod, Worker |
| Database | PostgreSQL, MongoDB, Cassandra, DynamoDB, Redis, Elasticsearch |
| Storage | S3, GCS, Blob Storage, NFS |
| Messaging | Kafka, RabbitMQ, SQS, Pub/Sub, EventBridge |
| AWS | EC2, ECS, Aurora, ElastiCache, CloudFront, ALB, etc. |
| GCP | GKE, Spanner, BigQuery, Pub/Sub, Cloud Run, Firestore |
| Azure | AKS, Cosmos DB, Service Bus, Blob, Functions |
| Security | WAF, Firewall, DDoS Scrubber, Rate Limiter, Vault |
| Observability | Prometheus, Grafana, Datadog, ELK Stack, Jaeger |
| AI/ML | ML Model, Feature Store, Vector DB, Embedding Service |
| Servers | Nginx, Apache, Tomcat, Node.js Server |

---

## Production Architecture Templates (11 total)

Pre-built, fully wired, production-grade reference architectures:

1. **E-Commerce Platform** — 24 nodes, CDN + WAF + 8 microservices + Redis + Kafka + read replicas
2. **Social Media Platform** — fan-out/fan-in, graph DB, ML recommendations, media CDN
3. **Video Streaming (Netflix-like)** — CDN-heavy, async transcoding pipeline, metadata DB
4. **Real-Time Chat** — WebSocket gateways, Redis Pub/Sub, Kafka durability, presence
5. **Fintech / Banking** — PCI-DSS inspired, fraud detection, ledger DB, compliance layers
6. **Ride-Sharing (Uber-like)** — location services, matching engine, real-time dispatch
7. **SaaS Platform** — multi-tenant, billing, feature flags, webhook delivery
8. **IoT Data Pipeline** — MQTT ingestion, stream processing, time-series DB
9. **Search Engine** — crawler pipeline, indexer, ranking service, query routing
10. **Online Gaming Backend** — game server mesh, matchmaking, leaderboard, state sync
11. **College Demo** — simplified 5-node architecture for educational use

---

## What Is Real vs What Is Simulated/Approximate

### Fully Working (Real)
- Drag-and-drop canvas with node/edge management
- Per-node configuration panel with full NodeData schema
- Client-side simulation engine running in browser (no backend needed for simulation)
- All traffic patterns, circuit breakers, retry logic, queue overflow
- Real-time animated request flow on edges (Framer Motion)
- Metrics dashboard with live charts (Recharts time-series)
- Architecture health scoring and advisor recommendations
- Node registry with 141+ types and realistic defaults
- 11 production templates with correct topologies
- SPOF detection (graph-based, in-degree analysis)
- Frontend auth (localStorage) and local canvas persistence
- Backend API fully built: auth/JWT, projects CRUD, simulation save, topology analysis, WebSockets

### Approximations / Known Limitations
| Feature | Current State | What's Missing |
|---------|--------------|----------------|
| **SLA estimation** | Multiplicative failure rate model | Doesn't account for redundant paths, multi-AZ, partial failures |
| **Cost estimation** | Heuristic $/month per node type | Not real AWS/GCP pricing API — illustrative only |
| **Latency values** | Configurable defaults based on node type | Not derived from real infrastructure benchmarks |
| **SPOF detection** | In-degree ≥ 3 heuristic | Doesn't run full graph articulation-point algorithm (Tarjan's) |
| **Backend integration** | Backend API built, tested | Frontend still reads/writes localStorage — backend not wired to UI |
| **Collaboration** | None | No multi-user canvas, no sharing links |
| **Export** | None | No PNG/PDF diagram export, no Terraform/IaC generation |
| **Real infra probing** | None | Cannot connect to live AWS/GCP accounts |

### What Doesn't Exist Yet
- User accounts connected to cloud (backend has auth but UI uses localStorage)
- Saved projects/simulations in database (backend exists, UI not connected)
- Share links / embeds
- Team/org workspaces
- Export to diagram formats (PNG, SVG, draw.io XML)
- Infrastructure-as-code generation (Terraform, Pulumi)
- Real cloud cost calculator (AWS Pricing API integration)
- AI-assisted architecture generation (LLM integration)
- Public template gallery / community sharing
- Paid tier / monetization

---

## Current Architecture State (Honest Assessment)

```
Frontend (90% complete)
├── Canvas          ✅ Fully working
├── Simulation      ✅ Fully working (client-side)
├── Templates       ✅ 11 templates loaded
├── Advisor         ✅ Static analysis working
├── Auth            ⚠️  localStorage only (not backend-connected)
└── Persistence     ⚠️  localStorage only (not backend-connected)

Backend (80% built, 0% connected to UI)
├── Auth routes     ✅ JWT login/register
├── Projects CRUD   ✅ SQLite + all routes
├── Simulations     ✅ Save/load with capped request logs
├── Analysis API    ✅ Server-side topology analysis
├── WebSocket       ✅ Infrastructure in place
└── UI integration  ❌ Not started
```

The single highest-leverage engineering task: wire `lib/api.ts` calls into the React components currently reading from localStorage.

---

## Market Opportunity

### Primary Markets

**1. System Design Education (~$2B TAM)**
- 1M+ engineers/year prep for FAANG system design interviews
- Platforms like Educative, ByteByteGo, and Grokking charge $20-60/month
- SystemFlow provides hands-on simulation that static content cannot

**2. Developer Productivity Tools (~$25B TAM)**
- Architecture planning currently done in draw.io, Miro, or Confluence
- Zero of these tools simulate behavior
- Engineering orgs spend significant time in architecture review cycles

**3. Engineering Education / Bootcamps**
- CS programs and bootcamps have no interactive distributed systems sandbox
- Lab-based learning requires cloud accounts with real cost risk

### Competitive Landscape

| Competitor | Strength | SystemFlow Advantage |
|-----------|---------|---------------------|
| draw.io / Lucidchart | Ubiquitous diagramming | Adds live simulation, no behavior |
| Whimsical | Beautiful diagrams | No distributed systems specificity |
| Structurizr | C4 model diagrams | Code-as-diagram, no simulation |
| CloudCraft | AWS-specific, 3D visuals | No simulation or advisor |
| k6 / Grafana k6 | Real load testing | Requires live infrastructure |
| Pulumi / Terraform | IaC-as-architecture | No visual simulation, requires cloud |
| ByteByteGo | System design education | Content-only, no sandbox |

**SystemFlow's defensible position:** Only tool that combines (1) cloud-vendor-neutral visual canvas + (2) behavioral simulation + (3) architecture health analysis in a single browser-based product.

---

## Business Model

### Freemium SaaS

| Tier | Price | Features |
|------|-------|---------|
| Free | $0 | 3 saved projects, all templates, full simulation |
| Pro | $15/month | Unlimited projects, export, share links, simulation history |
| Team | $49/user/month | Org workspace, comments, real-time collaboration |
| Enterprise | Custom | SSO, private templates, on-premise, compliance |

### Additional Revenue Streams
- **Interview prep bundle** — structured courses with SystemFlow sandbox ($49 one-time)
- **Template marketplace** — community-submitted premium templates
- **API access** — embed simulation engine in other tools
- **LMS integrations** — university/bootcamp licensing deals

---

## Roadmap

### Phase 1 — Complete Core Product (4-6 weeks)
- [ ] Wire frontend to backend API (auth, project save/load, simulation persist)
- [ ] Share links (read-only canvas URL)
- [ ] PNG/SVG export
- [ ] Deploy to production (Vercel + Railway/Render)
- [ ] Fix SPOF detection with proper Tarjan's articulation-point algorithm
- [ ] Real latency benchmarks as node defaults (replace rough estimates)

### Phase 2 — Grow Acquisition (2-3 months)
- [ ] Public template gallery with community submissions
- [ ] Embeddable simulation widget (iframe/SDK)
- [ ] GitHub integration (architecture-as-code sync)
- [ ] System design course integration (structured challenges with grading)
- [ ] Collaboration: cursors, comments, multi-user canvas

### Phase 3 — Enterprise & Monetization (3-6 months)
- [ ] AWS/GCP/Azure real pricing API integration (replace heuristic cost model)
- [ ] Terraform/Pulumi code generation from canvas
- [ ] AI-assisted architecture generation (LLM integration)
- [ ] Live infra import (read existing AWS topology via AWS SDK)
- [ ] SOC2 / SSO for enterprise
- [ ] Team dashboards and org-level simulation history

### Phase 4 — Platform (6-12 months)
- [ ] Plugin SDK for custom node types
- [ ] API for CI/CD integration (architecture drift detection)
- [ ] Marketplace for third-party integrations (DataDog, PagerDuty, etc.)
- [ ] Benchmark database (crowdsourced real-world latency/capacity numbers)

---

## Team Requirements

To execute Phase 1-2, need:
- 1 full-stack engineer (Next.js + Express integration)
- 1 frontend engineer (collaboration, export features)
- 1 designer (polish, onboarding, marketing site)
- GTM lead (community, content, system design community partnerships)

---

## Metrics to Track

| Metric | Target (6mo) |
|--------|-------------|
| Monthly Active Users | 10,000 |
| Simulations run/month | 50,000 |
| Pro conversions | 3-5% of MAU |
| MRR | $15,000 |
| NPS | >50 |

---

## Technical Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Simulation accuracy skepticism | Medium | Add disclaimer + benchmark against real k6 results; position as "design tool not load tester" |
| Big player builds same thing | Low-Medium | First-mover + community templates + integration depth create moat |
| Client-side sim perf limits | Low | Web Workers for heavy sim; server-side sim for enterprise tier |
| Node.js/SQLite doesn't scale | Low | SQLite fine to $1M ARR; migrate to Postgres when needed |
| Browser storage limits | Already hit | Already the reason backend exists — integration is the fix |

---

## Why Now

1. **System design education** is a $2B+ market with no interactive tooling — only PDFs and videos
2. **Remote engineering culture** increased demand for async architecture review tools
3. **Cloud complexity** exploded — 141+ node types reflects real tooling sprawl engineers navigate daily
4. **AI-native engineers** need tooling to visualize and validate LLM-generated architectures
5. **ReactFlow ecosystem** matured — building this two years ago would have taken 3× the effort

---

## Demo Flow (for live pitch)

1. Open blank canvas → drag User → API Gateway → Load Balancer → 2× Microservice → PostgreSQL
2. Run 100 RPS constant traffic → show healthy green flow
3. Spike to 1000 RPS → watch services go orange/red, queues back up
4. Enable circuit breaker on one service → watch it trip and recover
5. Open Architecture Advisor → get health score → follow suggestions (add Redis cache, add monitoring)
6. Load "E-Commerce" template → show 24-node production stack pre-built
7. Run chaos test → inject failures → watch cascade

Total demo time: ~4 minutes.

---

## Summary

SystemFlow has a working simulation engine, 141+ node types, 11 production templates, an architecture advisor, and a full backend — built by a small team. The core technical bet (client-side simulation of distributed system behavior) is validated and working. The missing pieces are integration work and go-to-market, not fundamental technical blockers.

**Ask:** [Amount] for [equity]% to fund 12 months of development, deployment, and growth to 10K MAU and $15K MRR.

---

*Last updated: May 12, 2026*
*Prepared by: Ayush Kumar Singh*
