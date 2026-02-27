# Platform Architectural & Feature Overview

**Project Name:** OpenInfi BaseRow (Alias: JetElite/Team Hub)  
**Version:** 2.0.0  
**Stack Engine:** Next.js 15 (App Router), Prisma, NeonDB (PostgreSQL), tRPC, Zustand, Socket.io, Inngest, TailwindCSS, Clerk, Express

---

## Table of Contents

- [Platform Architectural \& Feature Overview](#platform-architectural--feature-overview)
  - [Table of Contents](#table-of-contents)
  - [1. Core Architecture](#1-core-architecture)
    - [The Separation of Concerns](#the-separation-of-concerns)
  - [2. Authentication \& Multi-Tenant Organization (Team Hub)](#2-authentication--multi-tenant-organization-team-hub)
    - [2.1 Identity (Clerk)](#21-identity-clerk)
    - [2.2 Organizations (`/team`)](#22-organizations-team)
  - [3. Real-Time WebSocket Infrastructure](#3-real-time-websocket-infrastructure)
    - [3.1 Presence Engine (`useTeamPresence`)](#31-presence-engine-useteampresence)
    - [3.2 Live Activity Feed (`useActivityFeed`)](#32-live-activity-feed-useactivityfeed)
  - [4. CRM \& Sales Operating System](#4-crm--sales-operating-system)
    - [4.1 Leads \& Pipelines](#41-leads--pipelines)
    - [4.2 Client Profiles (`/clients`)](#42-client-profiles-clients)
    - [4.3 CRM Automation \& Workflows](#43-crm-automation--workflows)
  - [5. AI Research Engine (Decoupled Microservice)](#5-ai-research-engine-decoupled-microservice)
    - [5.1 The Puppeteer/Express Service (`/research`)](#51-the-puppeteerexpress-service-research)
    - [5.2 Real-Time Streaming (`/research/[id]`)](#52-real-time-streaming-researchid)
    - [5.3 Outputs](#53-outputs)
  - [6. Infinite Canvas (Visual Workspace)](#6-infinite-canvas-visual-workspace)
    - [6.1 Core Architecture (`/canvas`)](#61-core-architecture-canvas)
    - [6.2 Collaborative Nodes \& Entities](#62-collaborative-nodes--entities)
    - [6.3 Tooling \& Interactions](#63-tooling--interactions)
  - [7. Project \& Task Management](#7-project--task-management)
    - [7.1 Projects (`/projects`)](#71-projects-projects)
    - [7.2 Tasks (`/tasks`)](#72-tasks-tasks)
  - [8. High-Level Strategy \& Goal Tracking](#8-high-level-strategy--goal-tracking)
    - [8.1 Goals (`/strategy`)](#81-goals-strategy)
  - [9. Planning \& Productivity Tools](#9-planning--productivity-tools)
    - [9.1 The Hierarchy of Plans](#91-the-hierarchy-of-plans)
  - [10. Well-being \& Energy Management](#10-well-being--energy-management)
    - [10.1 Energy Tracking (`/well-being`)](#101-energy-tracking-well-being)
  - [11. Platform Robustness \& Data Integrity](#11-platform-robustness--data-integrity)
    - [11.1 Soft Deletes \& Optimistic Concurrency](#111-soft-deletes--optimistic-concurrency)
    - [11.2 Error Tracking \& Middlewares](#112-error-tracking--middlewares)
  - [12. Integrations \& Subsystems](#12-integrations--subsystems)

---

## 1. Core Architecture

The platform is designed as an all-in-one **Business Operating System**, built for high performance, real-time collaboration, and extreme customizability. It merges CRM, Project Management, AI Intelligence, and Visual Workspaces into a single uniform interface.

### The Separation of Concerns

1. **Next.js Frontend & API:** Server Actions / tRPC procedures handle direct data mutations and fetching securely using Prisma and Clerk authentication.
2. **Inngest Event Orchestrator:** Used for asynchronous, heavy-lifting background jobs (e.g., generating research, scraping web pages, triggering automated email drip campaigns).
3. **Standalone Express Node.js Service (`/research-engine`):** A secondary backend bypassing Vercel's serverless timeouts. It handles WebSockets (`socket.io`), Puppeteer-driven AI web scraping, and long-running job execution dispatched via Inngest.

---

## 2. Authentication & Multi-Tenant Organization (Team Hub)

The system supports a hybrid B2C (Solo Worker) and B2B (Multi-user Team) model.

### 2.1 Identity (Clerk)

- Users authenticate via **Clerk** (SSO, Magic Links, Passwords).
- Middleware protects all nested routes under `/dashboard`, `/team`, `/canvas`, `/projects`, etc.

### 2.2 Organizations (`/team`)

- **Creation & Roles:** Users can create Organizations and invite colleagues via email. Supported roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.
- **Entity Silos:** Projects, Tasks, Clients, and Canvases can be bound to an `organizationId`, restricting access to authorized team members.
- **Team Hub Dashboard:** A dedicated space showing active members, aggregated team performance metrics, and a live organizational activity feed.

---

## 3. Real-Time WebSocket Infrastructure

Powered by `socket.io` in the decoupled Express server, the platform provides seamless real-time multiplayer functionality.

### 3.1 Presence Engine (`useTeamPresence`)

- **Rooms:** Clients automatically subscribe to an `org-[id]` room upon opening the app.
- **Heartbeats & Location:** Every 30 seconds, the frontend broadcasts the user's active path (e.g., `/canvas`, `/projects/123`).
- **UI Reflection:** Other members see a "Green Dot" on the user's avatar across the app, complete with hover tooltips detailing exactly what page they are currently viewing.

### 3.2 Live Activity Feed (`useActivityFeed`)

- **Event Streaming:** Critical actions (Create/Update/Complete metrics) trigger REST calls to the Express server (`/emit-activity`), which immediately broadcasts over WebSockets.
- **UI Reflection:** The Team Hub's feed scrolls automatically as colleagues work, generating a pulse of team momentum.

---

## 4. CRM & Sales Operating System

A fully-fledged Customer Relationship Management suite tailored for high-ticket sales and long-term client retention.

### 4.1 Leads & Pipelines

- **Lead Capture:** Automated ingestion of `CrmLead` entities through external webforms or manual entry.
- **Pipelines & Deals:** Visual Kanban boards for Deals (`Deal`). Track expected value, close probability, and stages (e.g., Prospect, Qualified, Proposal, Won).

### 4.2 Client Profiles (`/clients`)

- **Rich Profiles:** Track `email`, `phone`, `companyName`, and nested JSON contacts.
- **Financials:** Monitor `lifetimeValue`, `outstandingBalance`, and custom `hourlyRate`.
- **Relationship Health:** Automated/Manual `ClientHealthScore` tracking (Red, Yellow, Green) and interaction frequency logging.

### 4.3 CRM Automation & Workflows

- Trigger-action architecture (If X happens -> Do Y).
- E.g., "If Deal advances to Proposal -> Send automated Email via EmailJS -> Create Follow-up Task".

---

## 5. AI Research Engine (Decoupled Microservice)

A standout proprietary feature that turns the application into an autonomous analyst.

### 5.1 The Puppeteer/Express Service (`/research`)

- Because edge/serverless functions time out after 10-60s, research operations (which can take 5+ minutes) are offloaded to an independent Express server.
- **Capability:** Instruct the AI (powered by Gemini/Groq) to research "Competitors in the South African SaaS market". The engine spins up headless browsers, navigates, scrapes, synthesizes, and logs its internal thoughts.

### 5.2 Real-Time Streaming (`/research/[id]`)

- Over WebSockets (`join-research` channel), the user watches the AI "think" in real-time. Logs stream directly into a retro terminal-style UI as the AI reads websites.

### 5.3 Outputs

- Extracted `CrmLeads` automatically piping into the sales pipeline.
- Formatted `Research` reports that can be attached to Projects or Canvases.

---

## 6. Infinite Canvas (Visual Workspace)

A Miro/Figma-like infinite canvas built from scratch using React, DOM nodes, and SVG overlays.

### 6.1 Core Architecture (`/canvas`)

- **Zustand Store:** Manages absolute coordinates `(x, y)`, `width`, `height`, and an undo/redo history stack (max 50 steps).
- **Infinite Pan/Zoom:** Navigational freedom using middle-click drag, Space+drag, or trackpad gestures, managed via CSS `transform` matrices.

### 6.2 Collaborative Nodes & Entities

- **Node Polymorphism:** Supports 10 types: `<Text>`, `<Sticky>`, `<Shape>`, `<Section>`, `<Checklist>`, `<NumberBadge>`, `<Embed>`, `<Image>`.
- **Deep Entity Linking:** The magic feature. Users can drag an active **Project, Task, or Client** onto the canvas. It renders as an interactive card showing live database values (e.g., Progress bars, Due Dates).

### 6.3 Tooling & Interactions

- **SVG Connections:** Connect nodes visually with bezier, straight, or elbow curves (via `<ConnectionLayer>`).
- **Free Drawing:** Quadratic bezier path rendering (`<FreeDrawLayer>`) for smooth, pen-like sketches.
- **Context Properties:** Floating toolbar and context menu for altering fonts, colors, borders, and opacities instantly.

---

## 7. Project & Task Management

A robust hierarchy for delivering client work.

### 7.1 Projects (`/projects`)

- Categorization by `status` (Planning, In Progress, Review, Completed).
- Financial tracking (`budgetHours`, `actualHoursSpent`, `completionPercentage`).

### 7.2 Tasks (`/tasks`)

- Granular workloads tied to Projects or Goals.
- Supports Dependencies (`dependsOn`, `blocks`) for critical-path analysis.
- **Integrated Timers:** Built-in play/pause functionality that automatically logs to `TimeEntry` relations.
- Recurring tasks support (`isRecurring`, `recurringPattern`).

---

## 8. High-Level Strategy & Goal Tracking

Bridging the gap between daily tasks and long-term vision.

### 8.1 Goals (`/strategy`)

- Top-level objectives (e.g., "Hit $1M ARR", "Launch V2").
- Linked to `KeyStep` entities (similar to OKRs / Key Results).
- Automated progress calculation based on the completion of underlying linked `Tasks`.

---

## 9. Planning & Productivity Tools

Tools designed for deep work and systemic focus.

### 9.1 The Hierarchy of Plans

- **Year Plans / Week Plans:** Narrative-driven planning matrices.
- **Day Plans (`/planning/day`):** Tactical daily checklists pulling exactly what is due today.
- **Time Boxing / Calendar:** Dragging tasks onto specific hours of the day (`TimeBlock`), integrating with the `/calendar` view.
- **Analytics & Burn Down:** Dashboards showing completion velocity and time-entered vs time-budgeted.

---

## 10. Well-being & Energy Management

Because high performance requires recovery.

### 10.1 Energy Tracking (`/well-being`)

- Logging subjective metrics (Sleep Quality, Stress, Focus, Mood).
- Tasks have an `energyRequired` field, allowing the system to logically suggest "low energy" tasks when the user's recorded daily state is sub-optimal.

---

## 11. Platform Robustness & Data Integrity

A high-resilience layer ensuring zero data loss and automated error tracking.

### 11.1 Soft Deletes & Optimistic Concurrency

- **Global Prisma Intercept:** The ORM is extended to trap `delete` and `deleteMany` commands, transforming them into `deletedAt` timestamp updates to preserve data history. Regular queries automatically filter out deleted records.
- **Concurrency Control:** Critical entities feature a `@default(1) version` integer to strictly prevent stale data overwrites in the multi-user Team Hub.

### 11.2 Error Tracking & Middlewares

- **Sentry Sideloading:** Edge, Server, and Client crash telemetry mapped natively.
- **Global tRPC Error Boundary:** Intercepts unhandled procedure exceptions, reports context (user, path, input) to Sentry, and returns normalized `TRPCError` to the UI.
- **Audit Logs Middleware:** All state-mutating API calls are intercepted, with entity signatures automatically extracted and saved to an `AuditLog` table.

---

## 12. Integrations & Subsystems

- **AI Assistants (Gemini/Groq):** Woven throughout the app for text generation, summarizing meeting notes, and structuring day plans.
- **Payments (PayFast):** Integrated webhook routes (`/api/payfast/checkout`, `/api/payfast/notify`) to handle B2B SaaS subscription billing.
- **File Attachments:** Extensively used within tasks and clients for managing deliverables.
- **Transactional Emails:** Utilizing EmailJS / Resend to alert users of invitations, meeting updates, or CRM automated outreach.

## 13. Recent Enterprise Architecture Upgrades (Phase 1-3)

The platform recently underwent a massive structural and type-safety upgrade to support true B2B SaaS scaling:

### 13.1 Phase 1: Foundation Security & Scale

- **NeonDB Row-Level Security (RLS):** True PostgreSQL-level tenant data isolation enforced by `ExtendedPrismaClient`. All queries natively scope to the active authenticated Organization without manual `where: { orgId }` clauses.
- **Background Orchestration:** Redis-backed job queues and concurrency limits integrated into the `research-engine` to prevent memory blowouts (OOM errors) during high-load AI automation tasks.

### 13.2 Phase 2: Engagement & UX

- **Global Cmd+K Command Palette:** Unified `searchAll` vector search indexing Projects, Clients, Canvases, Tasks, and Leads for instant cross-entity navigation.
- **In-App Notifications Engine:** Real-time bell interface powered by background polling and new `Notification` Prisma models linked to `User` interactions.

### 13.3 Phase 3: Enterprise Platform & Type Safety

- **Public Webhook Subsystem:** Developed `WebhookEndpoint` CRUD models with strict RLS policies and HMAC-SHA256 signature payloads, automatically dispatched during core mutations via `lib/webhooks.ts`.
- **Canvas Viewport Virtualization:** Solved infinite canvas DOM lag by writing a native Quadtree Spatial Partitioning data structure for sub-millisecond frustum culling, unmounting out-of-bounds nodes entirely.
- **SAML/SCIM Enterprise SSO:** Seamless active directory mapping injected directly into the `/settings/sso` dashboard via Clerk's `<OrganizationProfile />` B2B components.
- **Universal Type-Safety Hardening:** Full cleanup of deprecated tRPC `v10` signatures (`setQueryData` -> `setData`, `isLoading` -> `isPending`) ensuring `@trpc/react-query` `v11` compatibility, with 100% clean `tsc` validation across both Express and Next.js layers.

---

_Generated by OpenInfi AntiGravity System_
