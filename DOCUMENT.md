# Baserow (Productive You) - Comprehensive Codebase Documentation

Welcome to the definitive guide for **Baserow** (also known as **Productive You**). This document serves as a master blueprint for both human developers and AI agents to understand, maintain, and expand this powerful life orchestration system.

---

## 1. Project Overview & Philosophy

### 🚀 Vision

**"Never Rely on Memory Again. Build Systems That Execute."**

Baserow is not a simple task manager; it is a **Complete Life Operating System**. It is designed to transform abstract long-term goals into granular daily actions, while tracking every aspect of productivity, client management, and personal well-being.

### 🎯 Purpose

The system manages the "Cognitive Load" of modern life by:

- Organizing work into a **Hierarchical Planning System** (Years down to Hours).
- Providing a **Client Management Hub** (CRM) for freelancers and agencies.
- Implementing **Intelligent Tracking** to predict project completion based on real speed (velocity).
- Enforcing **Aesthetic Excellence** with a premium "Force Dark Luxury" design.

---

## 2. Technical Stack (The Engine)

Baserow is built with a modern, high-performance stack ensuring scale and reliability.

| Component              | Technology                                     | Description                                                            |
| :--------------------- | :--------------------------------------------- | :--------------------------------------------------------------------- |
| **Frontend Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | React-based framework for optimized server-side rendering and routing. |
| **Authentication**     | [Clerk](https://clerk.com/)                    | Secure, enterprise-grade user management and auth.                     |
| **Database**           | [PostgreSQL](https://www.postgresql.org/)      | Robust relational database for complex data structures.                |
| **ORM**                | [Prisma](https://www.prisma.io/)               | Type-safe database client for handling schemas.                        |
| **API Layer**          | [tRPC](https://trpc.io/)                       | Full-stack type safety without code generation.                        |
| **Styling**            | [Tailwind CSS 4](https://tailwindcss.com/)     | Utility-first CSS for the premium "Dark Luxury" aesthetic.             |
| **State Management**   | [Zustand](https://zustand-demo.pmnd.rs/)       | Lightweight client-side state management.                              |
| **Icons**              | [Lucide React](https://lucide.dev/)            | Consistent, clean iconography.                                         |

---

## 3. Database Schema: The Hierarchical "Brain"

The heart of Baserow lies in its data structure, defined in `prisma/schema.prisma`. It uses a nested hierarchy to link vision to execution.

### A. The Planning Hierarchy

1.  **YearPlan**: Defines the annual theme and vision.
    - Contains many **Goals**.
2.  **QuarterPlan**: Breaks the year into 90-day cycles.
    - Linked to **QuarterFocus** (which goals to push this quarter).
3.  **MonthPlan**: Monthly objectives and milestones.
    - Linked to **MonthFocus**.
4.  **WeekPlan**: Tactical execution for the week (Top 3 outcomes).
    - Linked to **WeekFocus**.
5.  **DayPlan**: Daily schedule, energy tracking, and "Most Important Tasks" (MITs).
    - Contains **TimeBlocks**.

### B. Execution Models

- **Project**: A collection of tasks. Can be "Client", "Personal", or "Life Area".
- **Task**: The atomic unit of work. Supports subtasks, dependencies, and priorities.
- **TimeEntry**: Tracks exact time spent on tasks for billing and analytics.
- **KeyStep**: Critical milestones within a specific Goal.

### C. CRM & Communication

- **Client**: Profiles for business contacts.
- **Communication**: Logs of emails, calls, and messages.
- **Meeting**: Integrated meeting scheduler with agenda and follow-up tasks.

---

## 4. Core Modules & Functionalities

### 🧭 Strategy (High-Level Vision)

Located in `app/(dashboard)/strategy`. This is where the user defines their "North Star".

- **Annual Vision**: Setting themes (e.g., "Year of Scale").
- **Success Criteria**: Measurable outcomes for the year.

### 📅 Planning (The Pipeline)

Located in `app/(dashboard)/planning`.

- **The Drag-and-Drop Workflow**: Moving goals from the Year -> Quarter -> Month.
- **Energy Budgeting**: Estimating how much "effort" a week requires.

### 🏗️ Projects & Tasks (The Engine Room)

Located in `app/(dashboard)/projects` and `app/(dashboard)/tasks`.

- **Smart Tracking**: If a task takes longer than estimated, the system adjusts the "Predicted Completion Date".
- **Priority Matrix**: Sorting tasks by Urgency and Importance.

### 🤝 CRM (Client Relations)

Located in `app/(dashboard)/clients`.

- **Communication Hub**: View all emails and meetings for a specific client in one place.
- **Meeting Scheduler**: Send links and track action items directly into the task manager.

### 📊 Analytics (Insights)

Located in `app/(dashboard)/analytics`.

- **Velocity Tracking**: How many tasks do you actually finish vs. plan?
- **Burnout Prevention**: Correlation between "Energy Scores" and productivity.

---

## 5. Design System: "Force Dark Luxury"

Baserow uses a high-end, premium aesthetic defined in `app/globals.css`.

- **Primary Colors**:
  - `Background`: `#000000` (Pure Black)
  - `Card/Sidebar`: `#22333b` (Jet Black)
  - `Primary Accent`: `#a9927d` (Dusty Taupe)
  - `Secondary Accent`: `#6b9080` (Jungle Teal)
- **UI Patterns**:
  - **Glassmorphism**: Subtle translucent overlays for popovers.
  - **Soft Elevation**: Using borders (`#2f3e46`) instead of heavy shadows for a flat, modern feel.
  - **Typography**: Inter/Geist Sans for maximum readability and a tech-forward look.

---

## 6. Directory Structure Map

```text
root/
├── app/                 # Next.js Pages & Layouts
│   ├── (auth)/          # Clerk Authentication pages
│   ├── (dashboard)/     # Main application modules
│   │   ├── analytics/   # Productivity & Energy charts
│   │   ├── clients/     # CRM & Communications
│   │   ├── planning/    # Hierarchical planning views
│   │   ├── strategy/    # High-level vision
│   │   └── tasks/       # Task engine & timers
│   ├── api/             # Webhooks & specialized routes
│   └── globals.css      # The Design System
├── components/          # Reusable UI Blocks
│   ├── ui/              # Radix/Shadcn base components
│   ├── dashboard/       # Specialized dashboard widgets
│   └── ...              # Module-specific components
├── server/              # Backend Logic (The "Stronghold")
│   ├── routers/         # tRPC API routes (Business Logic)
│   └── trpc.ts          # API Configuration
├── prisma/              # Database Schema (The "Skeleton")
├── public/              # Assets & Images
└── lib/                 # Shared utilities & helpers
```

---

## 7. How Everything Interlinks (The Flow)

To understand how Baserow functions, follow a single idea's journey:

1.  **Inception**: You create a **Goal** in the **Strategy** section (Year Plan).
2.  **Breakdown**: In **Planning**, you link that Goal to **Quarter 1**.
3.  **Milestone**: You create a **KeyStep** for that Goal.
4.  **Action**: That KeyStep is translated into a **Project** with specific **Tasks**.
5.  **Execution**: You schedule a **TimeBlock** in your **DayPlan** to work on a Task.
6.  **Tracking**: You start the **Task Timer**, which creates a **TimeEntry**.
7.  **Closure**: Once the Task is done, the **KeyStep** progress updates, eventually completing the **Goal**.

---

## 8. 🤖 Guidelines for Future AI Development

If you are an AI assistant continuing the development of Baserow:

1.  **Maintain Type Safety**: Use tRPC for all API calls. Always update `schema.prisma` before building new logic.
2.  **Respect the Hierarchy**: Ensure every new "execution" feature (tasks/projects) can be traced back to a "planning" entity (Goal/Plan).
3.  **Stick to the Aesthetic**: Use the variables in `globals.css` (e.g., `--color-primary`, `--color-card`). Avoid hardcoded hex values in components.
4.  **Update Analytics**: If you add a trackable action (like completing a meeting), ensure it updates the relevant `Analytics` data model.
5.  **Clerk Integration**: Always check for `auth()` or `getAuth(req)` in server routes to protect user data.

---

_This document is the source of truth for Baserow. When in doubt, follow the hierarchy._
