## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## COMPREHENSIVE TECHNICAL GUIDE

## Deep Research Agents

How They Work, What Competitors Miss, and How to Build the Next

## Generation

Prepared for: OpenInfi BaseRow — Research Engine Team

## Version: 1.0 | February 2026 | Confidential

Scope: Architecture, Step-by-Step Implementation, Innovations & Competitive Gaps

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## 1. What Is Deep Research?

Deep Research is not a single model call. It is a coordinated agentic pipeline
designed to answer complex questions that no single search or LLM response
could satisfy alone.
When a user submits a query like 'Who are the top 50 competitors in the South African SaaS
market and what are their funding rounds?' — a basic LLM response fails because the
information is scattered, dynamic, and requires multi-hop reasoning across dozens of sources.
Deep Research solves this by treating research as an autonomous workflow rather than a one-
shot generation task.
The core idea: spawn a team of AI agents, each with specialised roles, that plan, search,
scrape, validate, synthesise, and report — in parallel — and hand you a structured, cited
intelligence report at the end.

1.1 Deep Research vs. Standard Search vs. RAG

## Key Distinction Table

Standard Search — Returns links. You read them yourself.
Basic RAG — Retrieves similar-looking text chunks and generates a single-pass answer.

## Static.

Deep Research — Autonomously searches, scrapes, verifies, cross-references, reasons,
and synthesises across dozens of live sources iteratively.

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## 2. How Claude Deep Research Works

Anthropic has published the architecture of their multi-agent research system.
Here is how it actually functions, step by step.
2.1 The Multi-Agent Architecture
Claude's Research mode uses an orchestrator-worker pattern. A Lead Agent acts as the
research director. It analyses the query, builds a research strategy, and spawns multiple
Subagents — each assigned a specific slice of the problem — that work in parallel across their
own isolated context windows.
This matters for a key reason: parallel exploration via separate context windows prevents any
single agent from getting stuck in one information silo. Each subagent can independently follow
threads, read full pages, and return compressed intelligence to the Lead. The Lead then
synthesises findings, decides if more research is needed, and either spawns more subagents or
proceeds to report generation.

2.2 Step-by-Step Pipeline
The following table maps each phase of Claude's deep research pipeline from query ingestion
to report delivery.

## Step Phase What Happens

## 1

## Query Intake &

## Clarification

The Lead Agent receives the raw query. If
ambiguous, it internally formulates clarifying
assumptions or (in interactive mode) asks the user. It
establishes the research scope, depth requirements,
and output format.

## 2

## Research Strategy &

## Planning

The Lead decomposes the query into a directed
acyclic graph (DAG) of subtasks. Each node is an
answerable sub-question. Nodes with no
dependencies can be explored immediately in
parallel; others wait for upstream results. The plan is
persisted to memory.

## 3

## Subagent Spawning

(Parallel)
The Lead spawns N Subagents — each given a
specific research objective, tool permissions, source
constraints, and output format. Subagents are
isolated: each has its own context window and
explores independently. Typical N = 3-12 agents.

## 4

## Web Search & Tool Use

Each Subagent runs targeted web searches using
search APIs (Brave, Google, Tavily). It evaluates the
top 10-15 results, selects the 3-8 most relevant

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## Step Phase What Happens

URLs, and proceeds to fetch full page content. It can
also call structured APIs (arXiv, LinkedIn,
Crunchbase, etc.).

## 5

## Browser Navigation &

## Scraping

For complex pages, the agent uses headless browser
tools (or fetch tools) to navigate, extract text, follow
internal links, and handle JavaScript-rendered
content. It reads the actual page, not just the snippet.

## 6

## Iterative Reflection &

Re-Search
After reading sources, the Subagent reflects on gaps.
If a question is not answered, it reformulates its query
and runs additional searches. This loop repeats until
sufficient information is gathered or a step limit is hit.

## 7

## Subagent Return &

## Aggregation

Each Subagent compresses its findings into a
structured summary: key facts, extracted entities,
source URLs, confidence scores. It returns this to the

## Lead Agent.

## 8

## Lead Agent Synthesis

The Lead Agent receives all subagent reports, cross-
references findings for consistency, identifies
contradictions, and builds a coherent knowledge
base. It may spawn additional subagents to resolve
conflicts or fill remaining gaps.

## 9

## Citation Processing

A dedicated Citation Agent (or the Lead) maps every
factual claim in the draft report back to a specific
URL, page title, and retrieved date. It verifies that
citations actually support the associated claim.

## 10

## Report Generation

A Copywriter/Report Agent receives the synthesised
knowledge and citation map. It generates a
structured, well-formatted report with sections,
subsections, tables, and inline citations. Multiple
iteration passes improve quality.

## 11

## Validation & Delivery

The final report undergoes quality checks (claim
coverage, citation density, source credibility scores).
The output is returned to the user with full
provenance.

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

- Each Agent Explained in Depth
  3.1 The Lead Agent (Orchestrator)
  The Lead Agent is the strategic mind of the system. Its responsibilities span the full lifecycle of
  the research job:
- Interprets user intent — distinguishing between 'list me competitors' (breadth) vs.
  'analyse the funding landscape' (depth).
- Constructs the research DAG — a structured plan where each node is a sub-question
  and edges define dependencies.
- Writes detailed task descriptions for subagents — including what to find, what tools to
  use, what NOT to do (prevents duplication), and the expected output format.
- Monitors subagent progress and decides when enough information has been gathered.
- Synthesises conflicting or redundant information from multiple subagents into a unified
  knowledge base.
- Persists its plan to a memory store (critical: context windows have token limits; plans
  must survive truncation).
  3.2 Subagents (Parallel Researchers)
  Each Subagent is a specialised, isolated agent instance. Key design principles:
- Separation of concerns — each subagent explores a different angle, time period, or data
  source.
- Independent context windows — prevents path dependency; one subagent going down
  a rabbit hole doesn't contaminate others.
- Iterative retrieval loop — a subagent doesn't just search once. It searches, reads,
  reflects on gaps, and searches again until it converges.
- Structured output — returns a JSON-like summary of findings, citations, and confidence
  level to the Lead.

## 3.3 The Citation Agent

Accuracy at the claim level is what separates professional research from AI hallucination. The
Citation Agent's job is to ground every statement in the report to a specific source URL and
passage. It runs after synthesis and before final report generation, ensuring the report can be
independently verified.
3.4 The Credibility Critic (Where Implemented)
Some implementations (e.g., Microsoft's enterprise architecture) include a Credibility Critic
agent that evaluates source reliability — scoring sources based on domain authority, publication

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page
date, author credentials, and cross-source agreement. Scores are attached to facts before
synthesis.

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## 4. The Tool Ecosystem

Deep research agents are only as powerful as the tools they can call. Here is the
full taxonomy.

## 4.1 Information Retrieval Tools

- Web Search APIs — Brave Search, Google Custom Search, Tavily, Serper. Returns
  ranked URLs + snippets. Subagents use these for broad discovery.
- Full-Page Fetch Tools — Retrieve and parse the complete HTML/markdown content of a
  URL. Critical for reading actual content vs. snippets.
- Headless Browser Agents — Puppeteer, Playwright, Selenium. Navigate dynamic
  pages, click elements, handle authentication, scroll to load lazy content.
- Academic Search APIs — Semantic Scholar, arXiv, PubMed, CrossRef. For research
  papers and scientific citations.
- Structured Data APIs — Crunchbase (funding), LinkedIn (company/people), Hunter.io
  (emails), SimilarWeb (traffic), Companies House (registrations).
- Code Repository Search — GitHub search API, npm, PyPI for technical intelligence.
- News APIs — NewsAPI, GDELT, Factiva for time-bounded current events.
- Podcast/Video Transcription — Whisper-based tools to extract intelligence from
  audio/video content.

## 4.2 Reasoning & Analysis Tools

- Code Execution — Python sandbox (e.g., E2B) for data analysis, chart generation,
  statistical computation from retrieved datasets.
- Calculator / Math Tools — Precise numerical reasoning without hallucinated arithmetic.
- Entity Extraction — NER (Named Entity Recognition) tools to pull companies, people,
  dates, and dollar amounts from scraped text.
- Sentiment Analysis — Classify tone of reviews, news, or social content at scale.
- PDF/Document Parsing — Extract structured text from uploaded or scraped PDFs.

## 4.3 Memory & State Tools

- Short-term Memory — In-context scratch pad within the agent's current context window.
- Long-term Memory — Persistent store (database or vector DB) that survives context
  truncation. The Lead Agent writes its plan and key findings here.
- Knowledge Graph — Structured representation of entities and relationships discovered
  during research (e.g., Neo4j, FalkorDB). Enables reasoning about connections.
- Vector Store — Semantic search across all content retrieved during the session.

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## 5. How Major Players Compare

Understanding the architecture choices of each major player reveals where the gaps are — and
where you can innovate.

## Platform Architecture Parallel Agents Browser Use Source

## Credibility

## Your Gap

## Claude

## Orchestrator +

N subagents,
DAG planning
Yes Yes (fetch) Partial No knowledge
graph, no
persistent
memory across
sessions
OpenAI
Single o3 model

- RL-trained
  tool use

## Limited Yes (browse) Partial Opaque

reasoning; no
real-time
streaming to
user

## Gemini

## Multi-interface

(Google Search

- arXiv APIs)
  Yes No No No browser
  scraping of
  arbitrary sites;
  limited to
  indexed
  sources

## Perplexity

## Iterative

retrieval loop +
model routing
No No No No parallel
agents;
sequential
bottleneck at
scale

## Grok

## Segment-level

pipeline +
sparse attention

## No Partial Yes Closed

ecosystem;
limited to
indexed + X
network data

## Your Engine Puppeteer +

Gemini/Groq +
Inngest jobs

## No (yet) Yes No No

orchestrator,
no subagents,
no citation
agent, no
credibility
scoring

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## 6. What Your Engine Does Today

Your current research engine (Puppeteer + Gemini/Groq + Inngest) is genuinely impressive for
a first-generation implementation. Here is an honest map of what it already achieves and where
the gaps lie.

STRENGTHS — What You Already Have
Real browser scraping via Puppeteer — you actually navigate and read pages, unlike
Perplexity or Gemini
Real-time streaming to a terminal UI — one of the best UX patterns in the market; no
competitor does this as visually
Long-running job support via Inngest — bypasses serverless timeout limits (your core
architectural insight)
Redis-backed job queue with concurrency limits — production-grade stability
Direct pipeline output to CRM — research results become leads; this is a unique business
value chain
AI synthesis with Gemini/Groq — can generate coherent reports from scraped content

GAPS — What You Are Missing
No Lead Agent / Orchestrator — one LLM call does everything serially rather than planning
and parallelising
No subagent parallelism — research happens sequentially; 10 sites take 10x as long as 1
site
No research DAG / planning phase — no structured decomposition of the query into sub-
questions
No citation agent — reports are generated without claim-level source attribution
No source credibility scoring — all scraped content is treated equally, regardless of authority
No persistent memory across research sessions — the AI cannot learn from previous
research jobs
No structured entity extraction — data is returned as prose, not as structured CRM-ready
entities
No knowledge graph — relationships between entities (companies, people, markets) are not
mapped
No validation loop — reports are not checked for factual consistency before delivery

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

- How to Upgrade Your Engine to
  World-Class
  A phased upgrade plan that transforms your existing Puppeteer-based engine
  into a true multi-agent research system — without a full rewrite.
  Phase 1: Add the Orchestrator Layer
  Before any Puppeteer instances spin up, add an Orchestrator Agent that receives the query and
  produces a structured research plan. This single addition unlocks the rest of the architecture.
- Input: Raw user query + depth setting (quick / standard / deep / ultra-deep).
- Output: A JSON research plan with N sub-questions, each with a target source type,
  expected output format, and dependencies.
- Implementation: A single Gemini/Groq call with a carefully engineered system prompt.
  Roughly 200 lines of code.
- Where to add it: As the first Inngest step before the Puppeteer job is dispatched.

## Example Orchestrator Output

{ "query": "Top SA SaaS competitors", "subquestions": [
{ "id": 1, "question": "List all SA-based SaaS companies with >$1M ARR", "sources":

## ["crunchbase", "web"] },

{ "id": 2, "question": "What funding rounds have SA SaaS companies raised 2022-2025",
"sources": ["crunchbase", "techcrunch"], "dependsOn": [1] },
{ "id": 3, "question": "What are their core product positioning and target segments",
"sources": ["web", "product sites"], "dependsOn": [1] }

## ]

## }

## Phase 2: Parallel Subagent Execution

Once the research plan exists, execute independent sub-questions in parallel using Inngest's
fan-out capability — which you already have.

- Each subagent gets: one sub-question, tool permissions (web search + Puppeteer), and
  a max token budget.
- Subagents run in parallel via Inngest's step.run parallelism or concurrent job dispatch.
- Each subagent returns: a structured findings object with facts, source URLs, and
  confidence.
- Implementation: Convert your existing research job into a subagent template. Add a fan-
  out step. This is roughly 1-2 days of engineering.

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page
Phase 3: Add the Citation Agent
After all subagents return their findings, a Citation Agent processes the aggregated content and
maps every key claim to a specific source URL and passage. This is what makes the output
trustworthy enough to present to enterprise clients.

- Input: Draft report + list of source documents.
- Process: For each factual claim in the report, find the exact sentence in a source
  document that supports it.
- Output: A citation-annotated version of the report.
- Implementation: A single LLM call with the draft report and all source text in context.
  Requires careful prompt engineering. ~1 day.

## Phase 4: Source Credibility Scoring

Not all sources are equal. A Reddit comment is not the same as a Crunchbase funding record
or a government filing. Add a credibility scoring module that rates each source before its content
enters the synthesis pipeline.

- Domain authority score — use Moz API or a local heuristic based on TLD and domain
  age.
- Recency score — prefer sources published within relevant time window.
- Cross-source agreement — boost confidence when multiple independent sources agree
  on a fact.
- Source type classification — differentiate: official company site > industry publication >
  aggregator > forum.

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## 8. Revolutionary Innovations — What

## Nobody Has Built Yet

This section documents 8 innovations that go beyond what Claude, OpenAI,
Gemini, or Perplexity currently offer. These are your competitive differentiators.

INNOVATION #1 Temporal Knowledge Graph with Drift Detection
Current research agents synthesise a report and discard all the intelligence. They have no
memory. Imagine instead a knowledge graph that grows with every research job — entities
(companies, people, markets) are stored as nodes, relationships as edges, and all facts
have timestamps. When you run a new research job six months later, the system compares
the new findings against the existing graph and surfaces what has CHANGED — new
funding rounds, leadership changes, product pivots. This is institutional memory for your
business.
WHY NOW Knowledge graph infrastructure (Neo4j, FalkorDB) is now production-ready and cheap to
host. No research tool has implemented cross-session persistence at the entity level.
HOW TO BUILD Implement a KnowledgeGraph Prisma model with Entity, Relationship, and Fact
tables. After each research job, run an entity extraction pass and upsert into the graph. Add a 'drift
detection' Inngest job that diffs new findings against existing nodes and generates a change report.

INNOVATION #2 Confidence-Weighted Contradictory Source Reporting
All current research agents silently pick one source when sources disagree. A truly honest
intelligence system should surface contradictions explicitly: 'TechCrunch reports this
company raised $5M; their own press release says $3M; LinkedIn shows 12 employees.'
The system should present the contradiction with source confidence scores and let the user
decide which to trust. This is what human analysts do, and no AI research tool does it yet.
WHY NOW Source contradictions are a known unsolved problem in current deep research systems.
Enterprise clients specifically want to know when intelligence is disputed, not just when it's available.
HOW TO BUILD During synthesis, add a contradiction detection pass: cluster facts about the same
entity, compare values, flag discrepancies above a threshold, and generate a 'Conflicting Evidence'
section in the report with source links and confidence scores for each position.

INNOVATION #3 Research-to-CRM Entity Auto-Mapping with Confidence

## Thresholds

Your engine already pipes research outputs to CRM leads — but this pipeline is crude. The
next level is structured entity extraction with confidence thresholds: 'Company: Acme Corp

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page
(confidence: 0.95), Email: ceo@acme.com (confidence: 0.72, inferred from pattern),
Funding: $2.3M Series A (confidence: 0.88, sourced from 3 independent sources).' Only
entities above a confidence threshold are auto-created in the CRM; lower-confidence ones
go to a human review queue.
WHY NOW This directly reduces CRM data quality problems (garbage in, garbage out) which is a
top complaint of sales teams using AI research tools.
HOW TO BUILD Add a StructuredEntityExtractor agent that runs after synthesis. Use Gemini with a
strict JSON schema output. Map entity types to CRM fields. Implement a confidence_threshold
setting per org that controls auto-create vs. review queue routing.

INNOVATION #4 Adversarial Research Mode — Devil's Advocate Agent
Standard research agents confirm what the user is looking for. Add an adversarial Devil's
Advocate Agent that is explicitly instructed to find counter-evidence: reasons why the
market opportunity is wrong, why the company's claims are inflated, why the technology is
unproven. This is how a due diligence firm operates — they look for what the pitch deck is
hiding, not what it says. No AI research tool does this today.
WHY NOW Enterprise buyers (VC, M&A, procurement) specifically need adversarial research to
avoid expensive mistakes. This is a $500-2000/report service done by consultants today.
HOW TO BUILD Add a toggle in the research UI: 'Include Devil's Advocate Analysis'. When
enabled, spawn an additional subagent with a system prompt instructed to find contradicting
evidence, failure cases, and critical perspectives. Integrate its findings as a dedicated 'Risks &
Counterpoints' section.

INNOVATION #5 Adaptive Research Depth Based on Confidence

## Convergence

Current systems run for a fixed number of search iterations or until a time limit. A smarter
system measures confidence convergence: it keeps searching until new sources stop
adding meaningfully new information — then stops. Conversely, it searches deeper when
confidence is low or findings are contradictory. This makes research depth adaptive to the
actual complexity of the question, not a fixed budget.
WHY NOW This is how expert human researchers work — they know when they've found enough,
not when their time is up.
HOW TO BUILD Implement a ConfidenceTracker that scores each research iteration. If the new
information added (measured by semantic similarity to existing knowledge) falls below a threshold
across two consecutive iterations, stop. If contradiction density is high, add more iterations. This
makes the system self-regulating.

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page
INNOVATION #6 Live Research Sessions with User Steering
All current deep research tools are fire-and-forget: submit query, wait 15-30 minutes,
receive report. Your terminal streaming UI is already 80% of the way to something better: a
live session where the user can see what the AI is exploring and REDIRECT it mid-
research. 'That source looks promising — go deeper on that company.' or 'Ignore pricing
data, focus on technical architecture.' This turns research into a conversation.
WHY NOW Your real-time WebSocket streaming infrastructure is already built. No competitor has
implemented mid-research user steering. This is your biggest UX moat.
HOW TO BUILD Add a 'steer' event type to your WebSocket channel. When the user sends a
steering message, the Lead Agent receives it and can adjust the research plan: add new sub-
questions, cancel existing ones, or re-prioritise. Implement a research_state store that the Lead
reads on every iteration loop.

INNOVATION #7 Multimodal Research — Chart & Image Intelligence
Current research agents read text. But a huge amount of business intelligence lives in
images: org charts, funding slides, product roadmaps on presentation slides, charts on
industry report PDFs. A multimodal research agent can see and interpret these —
extracting data from a bar chart, reading a Crunchbase-style funding timeline, or parsing a
competitor's product screenshot.
WHY NOW Gemini is natively multimodal. You are already using it. This capability is sitting unused
in your current stack.
HOW TO BUILD When Puppeteer fetches a page, capture screenshots of key sections in addition to
text. Pass screenshots to Gemini with a vision-enabled prompt: 'What data is shown in this chart?' or
'What product features are described in this screenshot?' Add the extracted visual intelligence to the
subagent findings before synthesis.

INNOVATION #8 Research Quality Score & Reproducibility Audit Trail
Enterprise buyers need to trust research outputs. Add a Research Quality Score to every
report: how many unique sources were consulted, what percentage of claims are directly
cited, what is the average source domain authority, what is the contradiction rate. Also
generate a full audit trail — every search query run, every URL visited, every fact extracted,
with timestamps. A buyer can then independently verify that the research was thorough and
reproducible.
WHY NOW SOC2 compliance, procurement trust, and enterprise sales all require auditability. No
current research tool provides this. It is a procurement-closing feature.
HOW TO BUILD Store all agent actions (search queries, URLs fetched, facts extracted) in a
ResearchAuditLog Prisma table. At report delivery, compute the quality score from these logs.
Expose the audit trail as a downloadable appendix to the report. Add a 'Research Transparency'
settings toggle per org.

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## 9. Implementation Priority Matrix

Ranked by combined impact and implementation speed. Build in this order.

## # Upgrade Impact Effort What It Unlocks

## 1

Orchestrator Agent + DAG

## Planning

## Critical

2 days Unlocks all parallelism and
structured output

## 2

## Parallel Subagent Execution

## Critical

2 days 3-5x speed improvement;
deeper coverage

## 3

## Citation Agent

## High

1 day Enterprise trust; claim-level
provenance

## 4

## Source Credibility Scoring

## High

2 days Output quality; reduces
hallucination propagation

## 5

## Live Research Steering

(WebSocket)

## High

3 days Unique UX; biggest demo
differentiator

## 6

Structured Entity Auto-Extraction

## High

2 days CRM data quality; reduces
manual cleanup

## 7

## Contradictory Source Reporting

## Medium

2 days Enterprise due diligence use
case unlocked

## 8

## Research Audit Trail & Quality

## Score

## Medium

2 days SOC2 readiness; procurement
trust

## 9

## Temporal Knowledge Graph

## Strategic

1 week Institutional memory;
subscription retention moat

## 10

## Adversarial Devil's Advocate

## Agent

## Strategic

3 days Premium due diligence tier;
VC/M&A market

## 11

## Multimodal Visual Intelligence

## Strategic

3 days Chart/slide/PDF data extraction;
unique source types

## 12

## Confidence Convergence

## Stopping

## Nice-to-have

2 days Cost efficiency; adaptive quality

## DEEP RESEARCH AGENT — COMPLETE TECHNICAL GUIDE

OpenInfi BaseRow © 2025 Confidential Page

## 10. Strategic Positioning

With these innovations, your research engine is no longer a feature inside a
CRM. It is the product.
Consider the following market positioning for the research engine as a standalone product tier:

## Proposed Pricing Tiers

Research Starter ($0/mo) — 5 research jobs/month, basic web search only, no parallelism,
24hr report generation
Research Pro ($49/mo) — 50 jobs/month, parallel subagents, citation agent, source
credibility scoring, 15min reports
Research Enterprise ($299/mo) — Unlimited jobs, adversarial mode, knowledge graph,
audit trail, white-label reports, API access
Research API ($0.50/job credit) — Developer access to the research engine as a REST
API; webhook callbacks; Node.js SDK

The research engine public API alone — exposing your Puppeteer intelligence as a
programmable REST endpoint — opens you to a developer market that is 10x the size of your
current B2B SaaS target. Clay.com charges $800/month for simpler enrichment. You could
undercut them at $50/month and offer deeper intelligence.

This document was compiled from Anthropic engineering publications, academic research (arXiv 2506.18096,
2508.12752), and competitive analysis of Claude, OpenAI, Gemini, Perplexity, and Grok deep research architectures.
OpenInfi BaseRow | Research Engine Division | February 2026 | Confidential
