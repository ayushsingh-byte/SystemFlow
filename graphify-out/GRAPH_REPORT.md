# Graph Report - .  (2026-05-17)

## Corpus Check
- Corpus is ~40,535 words - fits in a single context window. You may not need a graph.

## Summary
- 322 nodes · 358 edges · 23 communities detected
- Extraction: 93% EXTRACTED · 6% INFERRED · 1% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Canvas & Export Layer|Canvas & Export Layer]]
- [[_COMMUNITY_App Shell & Config|App Shell & Config]]
- [[_COMMUNITY_Advisor & AI Analysis|Advisor & AI Analysis]]
- [[_COMMUNITY_API Controllers & Services|API Controllers & Services]]
- [[_COMMUNITY_Simulation UI Components|Simulation UI Components]]
- [[_COMMUNITY_Architecture Analysis Engine|Architecture Analysis Engine]]
- [[_COMMUNITY_Auth & Security Layer|Auth & Security Layer]]
- [[_COMMUNITY_Global State Store|Global State Store]]
- [[_COMMUNITY_Project Service|Project Service]]
- [[_COMMUNITY_WebSocket Layer|WebSocket Layer]]
- [[_COMMUNITY_React App Shell|React App Shell]]
- [[_COMMUNITY_Simulation Persistence|Simulation Persistence]]
- [[_COMMUNITY_Frontend Entry Points|Frontend Entry Points]]
- [[_COMMUNITY_Header Component|Header Component]]
- [[_COMMUNITY_CSRF Security|CSRF Security]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_SLO Ribbon|SLO Ribbon]]
- [[_COMMUNITY_Profiles Ribbon|Profiles Ribbon]]
- [[_COMMUNITY_Next.js Env Decls|Next.js Env Decls]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Traffic Ribbon|Traffic Ribbon]]
- [[_COMMUNITY_SVG Icons|SVG Icons]]

## God Nodes (most connected - your core abstractions)
1. `useSimulationEngine (Simulation Loop Hook)` - 20 edges
2. `useStore (Global State Hook)` - 17 edges
3. `Canvas Component` - 15 edges
4. `AppInner (Keyboard + Layout Orchestrator)` - 11 edges
5. `Express Application` - 10 edges
6. `useStoreImpl (State Implementation)` - 10 edges
7. `useUI (UI State Hook)` - 9 edges
8. `analyzeTopology()` - 8 edges
9. `Auth Middleware` - 6 edges
10. `useAuth (Auth State Hook)` - 6 edges

## Surprising Connections (you probably didn't know these)
- `useSimulationEngine (Simulation Loop Hook)` --implements--> `Simulation Engine (Event-Driven Discrete-Time Simulator)`  [INFERRED]
  public/simulation.jsx → INVESTOR_PITCH.md
- `PremiumModal (Pro Upgrade Modal)` --implements--> `Pro Tier ($19/month, 14-day trial)`  [INFERRED]
  public/modals.jsx → INVESTOR_PITCH.md
- `runAdvisor (Architecture Advisor Engine)` --implements--> `Architecture Advisor (SPOF & Health Analysis)`  [INFERRED]
  public/right-panel.jsx → INVESTOR_PITCH.md
- `Express Application` --references--> `SystemFlow Frontend HTML Entry`  [EXTRACTED]
  backend/src/app.js → public/SystemFlow.html
- `ChaosRibbon (Chaos Engineering Controls)` --implements--> `Chaos Engineering (Failure Injection Feature)`  [INFERRED]
  public/bottom-panel.jsx → INVESTOR_PITCH.md

## Hyperedges (group relationships)
- **Backend Security Middleware Stack** — middleware_ratelimit, middleware_auth, middleware_csrf, middleware_validate [INFERRED 0.90]
- **SQLite Relational Schema** — db_table_users, db_table_projects, db_table_simulations [EXTRACTED 1.00]
- **Mongoose Data Models (Legacy/Unused)** — model_user, model_project, model_simulation [EXTRACTED 1.00]
- **Express API Route Handlers** — route_auth, route_projects, route_simulations, route_analysis, route_ai [EXTRACTED 1.00]
- **Next.js Frontend Configuration** — next_config, eslint_config, postcss_config, app_layout, app_page [INFERRED 0.85]
- **WebSocket JWT Auth Flow** — websocket_index, service_auth, model_user [INFERRED 0.80]
- **Authentication Flow** — routes_auth, auth_controller, auth_service, auth_middleware, rate_limit_middleware, sqlite_db [EXTRACTED 1.00]
- **Simulation Save and Retrieval Flow** — routes_simulations, simulation_controller, simulation_service, auth_middleware, sqlite_db [EXTRACTED 1.00]
- **Project CRUD Flow** — routes_projects, project_controller, project_service, auth_middleware, sqlite_db [EXTRACTED 1.00]
- **Topology Analysis Flow** — routes_analysis, analysis_controller, analysis_service, project_service, auth_middleware, rate_limit_middleware [EXTRACTED 1.00]
- **AI Architecture Chat Flow** — routes_ai, ai_controller, ai_service, anthropic_api, auth_middleware [EXTRACTED 1.00]
- **All Frontend Components Reading from useStore** — component_header, component_canvas, component_rightpanel, component_leftpanel, component_bottompanel, component_ragtab, component_advisortab, component_configtab, component_metricstab, component_logtab, component_templatestab, component_simulateribbbon, component_trafficribbon, component_chaosribbon, component_whatifribbon, component_sloribbon, component_profilesribbon, component_testlabribbon, component_incidentribbon, component_interviewribbon, component_hightrafficmodal, component_appinner, simulation_engine [EXTRACTED 1.00]
- **Simulation Loop Participants** — simulation_engine, store_simconfig, store_nodes, store_edges, store_metrics, store_nodehealth, store_requestlog, store_simulationhistory, store_crashalerts, store_crashednodes, store_chaoskillednodes, store_bottlenecknodeid, store_whatifoverrides, simulation_analyzecrashreason, simulation_configimproved, simulation_bfstraffic, simulation_chaosmonkey, data_checkedgevalidity [EXTRACTED 1.00]
- **Canvas Interaction Components** — component_canvas, component_sysnode, component_edgeview, component_minimap, component_crashdetailmodal, store_nodes, store_edges, store_nodehealth, store_addnode, store_addedge, store_removenode, canvas_exporttopng, canvas_exporttojson [INFERRED 0.90]
- **Right Panel Tab Components** — component_rightpanel, component_configtab, component_metricstab, component_logtab, component_advisortab, component_templatestab, component_teamtab, component_ragtab [EXTRACTED 1.00]
- **Bottom Panel Ribbon Tabs** — component_bottompanel, component_simulateribbbon, component_trafficribbon, component_chaosribbon, component_whatifribbon, component_sloribbon, component_profilesribbon, component_testlabribbon, component_incidentribbon, component_interviewribbon [EXTRACTED 1.00]
- **Undo/Redo History System** — store_history, store_undo, store_redo, store_nodes, store_edges, store_usestoreimpl, component_appinner [EXTRACTED 1.00]
- **Core Product Concepts (Investor Pitch)** — concept_visual_simulator, concept_canvas_editor, concept_simulation_engine_doc, concept_architecture_advisor, concept_interview_mode, concept_chaos_engineering, concept_spof_detection, concept_freemium_saas, concept_premium_tier, concept_target_market [EXTRACTED 1.00]
- **AI Chat System (RagTab + Fallback)** — component_ragtab, rag_ragrespond, api_ai_chat, advisor_runadvisor, store_nodes, store_edges, store_metrics, store_simconfig [EXTRACTED 1.00]

## Communities

### Community 0 - "Canvas & Export Layer"
Cohesion: 0.06
Nodes (37): /api/projects (Backend Project CRUD Endpoint), exportToJSON (JSON Export Utility), exportToPNG (PNG Export Utility), Canvas Component, CrashDetailModal (Node Crash Inspector), MiniMap (Canvas Minimap Navigator), SysNode (Canvas Node Renderer), TemplatesTab (Architecture Templates Tab) (+29 more)

### Community 1 - "App Shell & Config"
Cohesion: 0.11
Nodes (27): App Root Layout, App Home Page (Redirect), Express Application, SQLite Database Module, Backend HTTP Server Entry, DB Table: projects, DB Table: simulations, DB Table: users (+19 more)

### Community 2 - "Advisor & AI Analysis"
Cohesion: 0.14
Nodes (26): detectCyclesFn (Circular Dependency Detector), runAdvisor (Architecture Advisor Engine), /api/ai/chat (Backend AI Chat Endpoint), AdvisorTab (Architecture Advisor Tab), AppInner (Keyboard + Layout Orchestrator), BottomPanel Component (Simulation Ribbon), ConfigTab (Node Config Tab), Header Component (+18 more)

### Community 3 - "API Controllers & Services"
Cohesion: 0.16
Nodes (19): AI Controller, AI Service, Analysis Controller, Analysis Service, Anthropic Claude API, Auth Controller, Auth Middleware, Auth Service (+11 more)

### Community 4 - "Simulation UI Components"
Cohesion: 0.11
Nodes (18): ChaosRibbon (Chaos Engineering Controls), EdgeView (Animated Edge Renderer), IncidentRibbon (Incident Replay), InterviewRibbon (System Design Interview Mode), SimulateRibbon (Run/Pause/Stop Controls), Architecture Advisor (SPOF & Health Analysis), Visual Canvas (Drag-Drop Architecture Editor), Chaos Engineering (Failure Injection Feature) (+10 more)

### Community 7 - "Architecture Analysis Engine"
Cohesion: 0.29
Nodes (9): analyzeTopology(), buildGraph(), calculateInDegrees(), calculateScore(), calculateTotalLatency(), detectBottlenecks(), detectSPOFs(), findCriticalPath() (+1 more)

### Community 8 - "Auth & Security Layer"
Cohesion: 0.21
Nodes (6): authMiddleware(), generateToken(), getUserById(), login(), register(), verifyToken()

### Community 9 - "Global State Store"
Cohesion: 0.27
Nodes (6): AuthProvider(), StoreProvider(), UIProvider(), useAuthImpl(), useStoreImpl(), useUIImpl()

### Community 10 - "Project Service"
Cohesion: 0.44
Nodes (7): assertOwner(), createProject(), deleteProject(), duplicateProject(), getProject(), rowToProject(), updateProject()

### Community 11 - "WebSocket Layer"
Cohesion: 0.32
Nodes (3): handleMessage(), subscribeToProject(), unsubscribeFromProject()

### Community 13 - "React App Shell"
Cohesion: 0.25
Nodes (1): ErrorBoundary

### Community 15 - "Simulation Persistence"
Cohesion: 0.38
Nodes (3): getSimulation(), rowToSim(), saveSimulation()

### Community 16 - "Frontend Entry Points"
Cohesion: 0.29
Nodes (7): App Component (Root Shell), ErrorBoundary (React Error Boundary), SystemFlow.html (Main Entry Point), localStorage sf_current_user (Persisted Auth State), AuthProvider (Context Provider), StoreProvider (Context Provider), UIProvider (Context Provider)

### Community 18 - "Header Component"
Cohesion: 0.4
Nodes (2): Header(), patternGlyph()

### Community 20 - "CSRF Security"
Cohesion: 0.67
Nodes (2): generateCsrfToken(), setCsrfCookie()

### Community 25 - "ESLint Config"
Cohesion: 0.67
Nodes (3): ESLint Config, ESLint Config Next TypeScript, ESLint Config Next Core Web Vitals

### Community 31 - "PostCSS Config"
Cohesion: 1.0
Nodes (2): PostCSS Config, Tailwind CSS PostCSS Plugin

### Community 32 - "SLO Ribbon"
Cohesion: 1.0
Nodes (2): SloRibbon (SLO Calculator), sloTargets (SLO Configuration)

### Community 33 - "Profiles Ribbon"
Cohesion: 1.0
Nodes (2): ProfilesRibbon (Traffic Profiles), PROFILES (Traffic Load Profiles)

### Community 51 - "Next.js Env Decls"
Cohesion: 1.0
Nodes (1): Next.js Environment Type Declarations

### Community 52 - "Next.js Config"
Cohesion: 1.0
Nodes (1): Next.js Config

### Community 53 - "Traffic Ribbon"
Cohesion: 1.0
Nodes (1): TrafficRibbon (Rate & Pattern Config)

### Community 54 - "SVG Icons"
Cohesion: 1.0
Nodes (1): SVG (Icon Library)

## Ambiguous Edges - Review These
- `User Model (Mongoose)` → `DB Table: users`  [AMBIGUOUS]
  backend/src/models/User.js · relation: conceptually_related_to
- `Simulation Model (Mongoose)` → `DB Table: simulations`  [AMBIGUOUS]
  backend/src/models/Simulation.js · relation: conceptually_related_to
- `Project Model (Mongoose)` → `DB Table: projects`  [AMBIGUOUS]
  backend/src/models/Project.js · relation: conceptually_related_to

## Knowledge Gaps
- **56 isolated node(s):** `PostCSS Config`, `Tailwind CSS PostCSS Plugin`, `Next.js Environment Type Declarations`, `ESLint Config Next Core Web Vitals`, `ESLint Config Next TypeScript` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `React App Shell`** (8 nodes): `App()`, `AppInner()`, `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`, `app.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Header Component`** (6 nodes): `Header()`, `HelpDropdown()`, `header.jsx`, `MetricCell()`, `patternGlyph()`, `ProfileDropdown()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CSRF Security`** (4 nodes): `csrf.js`, `generateCsrfToken()`, `setCsrfCookie()`, `validateCsrf()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (2 nodes): `PostCSS Config`, `Tailwind CSS PostCSS Plugin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SLO Ribbon`** (2 nodes): `SloRibbon (SLO Calculator)`, `sloTargets (SLO Configuration)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profiles Ribbon`** (2 nodes): `ProfilesRibbon (Traffic Profiles)`, `PROFILES (Traffic Load Profiles)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Env Decls`** (1 nodes): `Next.js Environment Type Declarations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `Next.js Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Traffic Ribbon`** (1 nodes): `TrafficRibbon (Rate & Pattern Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SVG Icons`** (1 nodes): `SVG (Icon Library)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `User Model (Mongoose)` and `DB Table: users`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Simulation Model (Mongoose)` and `DB Table: simulations`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Project Model (Mongoose)` and `DB Table: projects`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useSimulationEngine (Simulation Loop Hook)` connect `Canvas & Export Layer` to `Advisor & AI Analysis`, `Simulation UI Components`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `useStore (Global State Hook)` connect `Advisor & AI Analysis` to `Canvas & Export Layer`, `Simulation UI Components`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `useAuth (Auth State Hook)` connect `Advisor & AI Analysis` to `Frontend Entry Points`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `PostCSS Config`, `Tailwind CSS PostCSS Plugin`, `Next.js Environment Type Declarations` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._