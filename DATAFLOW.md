# Productive You: System Architecture & Dataflow

This document outlines the existing infrastructure of the _Productive You_ platform, focusing specifically on the **Research Engine**, **Data Pipelines**, and how the application operates under the hood.

If you are a developer, operator, or business owner reading this, this document will give you a comprehensive understanding of how the system works and what is currently missing to achieve a fully automated Lead Generation Agency workflow.

---

## 1. High-Level Architecture

The platform is split into two main operational environments working in tandem:

### A. The Core Application (Next.js)

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL with Prisma ORM (schema manages everything from standard `User` and `Task` to complex `CrmLead`, `Pipeline`, and `Research` models).
- **API Layer**: tRPC ensuring end-to-end type safety between the frontend React components and backend services.
- **Authentication**: Clerk handles user identity and session management.

### B. The Research Engine (Standalone Node.js/Express)

- **Reason for existence**: Standard Next.js serverless functions (like on Vercel) time out after 60 seconds. Deep AI research (scraping 10+ sites, feeding it to LLMs) takes minutes.
- **Infrastructure**: Express server (usually deployed on Render) orchestrates long-running jobs.
- **Job Background Orchestration**: **Inngest** is used as the event-driven queue. When a user requests research, the Next.js app fires an Inngest event, which the Research Engine picks up and processes asynchronously, streaming updates back to the client via WebSockets (`Socket.io`).

---

## 2. Core Data Pipelines

### A. The Deep Research Pipeline

Whenever an agentic research task is initiated, the system executes the following pipeline in the `research-agent` (Inngest):

1. **Initialization**: Fetch research parameters and user LLM settings (Gemini, Groq overrides).
2. **Search & Scrape Phase**:
   - Depending on settings, it triggers **Serper** for Google search results.
   - It filters URLs and passes them to **Jina AI** for clean, markdown-based extraction.
   - _Agentic Mode_: It runs iteratively. It searches -> scrapes -> asks an LLM "What are the gaps in my knowledge?" -> searches again to fill those gaps.
   - _Alternative (Gemini Deep Research)_: Uses Gemini's native Web Grounding tools for autonomous research.
3. **LLM Analysis Phase**: All the accumulated markdown from `n` websites is fed into an LLM (Gemini 2.0 Flash or Groq/Llama). The LLM extracts structured `ResearchInsight` records.
4. **Action Item Generation**: The LLM looks at the final insights and generates 10 concrete, actionable tasks (saved as `ActionItem` models) that map directly back to the project.

### B. The Lead Generation Pipeline

A specialized fork of the Research Pipeline tailored for B2B outreach:

1. The standard research pipeline runs to understand a market, a keyword, or a competitor.
2. An additional LLM prompt is executed: _"Based on these findings, identify potential business leads, companies, or organizations."_
3. The LLM extracts a structured JSON array of leads (Name, Company, Industry, Location, Pain Points, Suggested DM, Suggested Email).
4. These are saved into the `Lead` and `LeadData` schemas.

### C. The CRM & Pipeline Workflow (Sales)

Once leads are generated or manually added, they enter the CRM Pipeline constraint:

1. **Pipelines & Stages**: `Pipeline` -> `PipelineStage`. Default stages are: _Discovery -> Qualification -> Proposal -> Negotiation -> Closed Won/Lost_.
2. **Deals & Leads**: Leads are tracked via `CrmLead`. They can be enriched, given a score, and moved linearly through the pipeline.
3. **Activities**: Every touchpoint (Email, Meeting, Call) is logged as a `CrmActivity` or `Communication` linked to the client and the deal.

### D. The Execution Engine (Goals & Time Management)

How the operator actually executes the work:

1. **Planning Hierarchy**: `YearPlan` -> `QuarterPlan` -> `MonthPlan` -> `WeekPlan` -> `DayPlan`.
2. **Tasks & Time Blocks**: Daily activities are broken down into discrete `TimeBlock` elements linked to a `Task`, `Project`, or `Client`.
3. **Execution**: The system tracks estimated vs. actual time and required energy levels to optimize the operator's output.

---

## 3. What is Missing (The Gap Analysis)

To run an **Industry-Leading Lead Generation Agency**, the core data generation works beautifully. However, the _automation and outreach workflows_ need scaling:

1. **Automated Outbound Sequencing (Missing)**: Currently, leads are generated and sit in the database. There is no automated cron job or Inngest function that automatically sends the initial cold email via a connected inbox (e.g., Google/Outlook OAuth or SendGrid) and tracks open/reply rates sequentially.
2. **Multi-Channel Workflows (Missing)**: The schema supports `socialProfiles` in CRM, but there is no automated LinkedIn outreach (via tools like Unibox/PhantomBuster integrations) tied into the `CrmWorkflow` system yet.
3. **Advanced Lead Enrichment (Missing/Manual)**: While the LLM "guesses" emails based on patterns, integrating a real clearinghouse API (like Apollo.io, Hunter.io, or Dropcontact) directly into the Inngest Lead Pipeline would guarantee verified contact details before entering the CRM.
4. **Client-Facing Portals (Missing)**: If managing lead generation for _other_ businesses (clients), having a scoped "Client Portal" where your agency clients can log in and view the pipeline of leads you generated for them in real-time.

---

## Summary of the Flow

**User Prompt** -> **Inngest Event** -> **Puppeteer/Serper/Jina (Web Scraping)** -> **Gemini/Groq (LLM Extraction)** -> **DB (Leads & Insights)** -> **CRM Pipeline (qualification)** -> **Execution (Tasks & Time Blocks to close the deal).**
