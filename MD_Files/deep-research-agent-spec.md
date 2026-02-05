# Refined Prompt: Deep Research Agent Integration for Baserow

Based on the Baserow architecture, here's a refined, implementation-ready specification:

---

## **Feature: Deep Research Agent Module**

### **1. Integration Point**
- **Location**: New module at `app/(dashboard)/research/`
- **Sidebar Entry**: Add "🔍 Research Agent" between "Analytics" and "Clients" in the main navigation
- **Database Models**: Extend `prisma/schema.prisma` with new research-tracking entities

---

## **2. Core Workflow**

### **Phase 1: Research Initiation**
1. User clicks "🔍 Research Agent" in sidebar
2. Opens research creation modal with:
   - **Topic Input**: Main research question/goal
   - **Research Scope**: Dropdown (Market Analysis, Lead Generation, Competitive Intelligence, Business Strategy, etc.)
   - **Gemini API Key**: Secure input field (encrypted storage in user settings)
   - **Linked Goal** (Optional): Connect research to existing Goal/Project from hierarchy

### **Phase 2: Prompt Refinement**
- System analyzes input and generates optimized research prompt
- Shows side-by-side comparison: Original vs. Refined
- User approves or requests modifications
- Auto-saves prompt iterations for learning

### **Phase 3: Background Execution (Inngest)**
- Triggers `research.initiated` event
- Inngest job performs:
  - Multi-source web scraping (respecting robots.txt)
  - Gemini API calls for synthesis and analysis
  - Data validation and fact-checking
  - Chart/graph generation using libraries like Chart.js/Recharts
  - Lead data extraction (when applicable)

### **Phase 4: Results Storage**
Create new Prisma models:

```prisma
model Research {
  id          String   @id @default(cuid())
  userId      String
  title       String
  scope       ResearchScope
  status      ResearchStatus // PENDING, IN_PROGRESS, COMPLETED, FAILED
  
  // Core Data
  originalPrompt  String
  refinedPrompt   String
  rawData         Json   // Unprocessed research output
  
  // Outputs
  sources     ResearchSource[]
  insights    ResearchInsight[]
  actionItems ActionItem[]
  leadData    LeadData?
  
  // Hierarchy Link
  goalId      String?
  goal        Goal?   @relation(fields: [goalId], references: [id])
  
  createdAt   DateTime @default(now())
  completedAt DateTime?
}

model ResearchSource {
  id          String   @id @default(cuid())
  researchId  String
  research    Research @relation(fields: [researchId], references: [id])
  
  url         String
  title       String
  excerpt     String
  credibility Float    // AI-assigned trust score
  citedInSections String[] // Which insights reference this
}

model ResearchInsight {
  id          String   @id @default(cuid())
  researchId  String
  research    Research @relation(fields: [researchId], references: [id])
  
  title       String
  content     String   @db.Text
  category    String   // Market Trends, Risk Factors, Opportunities
  visualData  Json?    // Chart configurations
  confidence  Float    // AI confidence level
}

model ActionItem {
  id          String   @id @default(cuid())
  researchId  String
  research    Research @relation(fields: [researchId], references: [id])
  
  description String
  priority    Priority // HIGH, MEDIUM, LOW
  effort      Int      // 1-5 scale
  
  // Auto-conversion to Task
  convertedToTaskId String?
  convertedToTask   Task?   @relation(fields: [convertedToTaskId], references: [id])
}

model LeadData {
  id          String   @id @default(cuid())
  researchId  String   @unique
  research    Research @relation(fields: [researchId], references: [id])
  
  leads       Lead[]
  totalFound  Int
  exportedAt  DateTime?
}

model Lead {
  id          String   @id @default(cuid())
  leadDataId  String
  leadData    LeadData @relation(fields: [leadDataId], references: [id])
  
  name        String
  company     String?
  email       String?
  phone       String?
  website     String?
  industry    String?
  
  // AI-generated outreach
  painPoints      String[] // What they need
  suggestedDM     String   @db.Text
  suggestedEmail  String   @db.Text
  personalization Json     // Custom fields per lead
}
```

---

## **3. UI Components**

### **Research Dashboard** (`app/(dashboard)/research/page.tsx`)
- Grid view of all research projects
- Status indicators (⏳ In Progress, ✅ Complete, ❌ Failed)
- Quick filters: By Date, Scope, Linked Goal
- "New Research" button (top-right, primary accent color)

### **Research Detail View** (`app/(dashboard)/research/[id]/page.tsx`)
**Tabbed Interface:**

#### **Tab 1: Overview**
- Executive Summary (AI-generated 3-5 sentence synopsis)
- Key Metrics cards (Sources Analyzed, Insights Generated, Confidence Score)
- Visual timeline of research process

#### **Tab 2: Sources**
- Searchable/filterable table
- Columns: Title, URL, Credibility, Citations
- Click to open source in modal with highlighted excerpts

#### **Tab 3: Insights & Visualizations**
- Accordion sections by category
- Embedded charts (Bar, Line, Pie using Recharts)
- Download individual graphs as PNG
- Confidence indicators per insight

#### **Tab 4: Action Items**
- Kanban board (To Review → To Convert → Converted)
- One-click conversion to Project/Task
  - Opens modal pre-filled with action item details
  - Asks which Goal/Quarter to link
  - Creates Project + Tasks in existing hierarchy

#### **Tab 5: Lead Generation** (Conditional - only for lead research)
- Spreadsheet view (react-data-grid or AG Grid)
- Columns: All lead fields + suggested outreach
- Bulk actions: Export CSV, Import to Clients, Mark as Contacted
- Click row to expand full details + edit outreach templates

#### **Tab 6: Full Report**
- Markdown editor (react-markdown) with complete report
- Export options:
  - PDF with branding (using jsPDF + charts)
  - Markdown file
  - Share link (read-only public URL)

---

## **4. Technical Implementation**

### **Backend (tRPC Routers)**
**New Router**: `server/routers/research.ts`

```typescript
export const researchRouter = createTRPCRouter({
  // Create research
  create: protectedProcedure
    .input(z.object({
      title: z.string(),
      originalPrompt: z.string(),
      scope: z.enum(['MARKET_ANALYSIS', 'LEAD_GEN', ...]),
      goalId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Create research record
      // 2. Trigger Inngest event
      // 3. Return research ID
    }),

  // Get refined prompt
  refinePrompt: protectedProcedure
    .input(z.object({ originalPrompt: z.string() }))
    .mutation(async ({ input }) => {
      // Call Gemini API for prompt engineering
    }),

  // List all research
  list: protectedProcedure.query(async ({ ctx }) => { ... }),

  // Get single research with all relations
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => { ... }),

  // Convert action item to task
  convertActionToTask: protectedProcedure
    .input(z.object({ actionItemId: z.string(), goalId: z.string() }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Export report as PDF
  exportPDF: protectedProcedure
    .input(z.object({ researchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Generate PDF with charts
      // Store in public/exports/
      // Return download URL
    }),
});
```

### **Inngest Background Jobs**
**File**: `inngest/research-agent.ts`

```typescript
export const researchAgent = inngest.createFunction(
  { id: "research-agent" },
  { event: "research.initiated" },
  async ({ event, step }) => {
    const { researchId, refinedPrompt, scope } = event.data;

    // Step 1: Web scraping
    const sources = await step.run("fetch-sources", async () => {
      // Use Puppeteer/Playwright for dynamic sites
      // Respect rate limits
    });

    // Step 2: Gemini analysis
    const insights = await step.run("analyze-data", async () => {
      // Send sources to Gemini for synthesis
    });

    // Step 3: Generate visualizations
    const charts = await step.run("create-charts", async () => {
      // Use Recharts/Chart.js server-side rendering
    });

    // Step 4: Lead extraction (if scope = LEAD_GEN)
    if (scope === "LEAD_GEN") {
      const leads = await step.run("extract-leads", async () => {
        // Parse structured data
        // Generate personalized outreach
      });
    }

    // Step 5: Update database
    await step.run("finalize", async () => {
      await db.research.update({
        where: { id: researchId },
        data: { status: "COMPLETED", completedAt: new Date() }
      });
    });
  }
);
```

### **Required NPM Packages**
```json
{
  "dependencies": {
    "inngest": "^3.x",
    "@google-cloud/aiplatform": "^3.x", // Gemini API
    "puppeteer": "^21.x", // Web scraping
    "recharts": "^2.x", // Charts
    "jspdf": "^2.x", // PDF generation
    "html2canvas": "^1.x", // Chart to image
    "react-markdown": "^9.x", // Markdown rendering
    "ag-grid-react": "^31.x" // Spreadsheet view
  }
}
```

---

## **5. Design Integration (Force Dark Luxury)**

### **Color Assignments**
- Research status badges:
  - In Progress: `#6b9080` (Jungle Teal)
  - Completed: `#a9927d` (Dusty Taupe)
  - Failed: `#c1121f` (Error Red)
- Action item cards: `#22333b` background with `#2f3e46` borders
- Lead rows: Hover effect with `#1a252f` background

### **Typography**
- Research titles: `text-2xl font-semibold` (Geist Sans)
- Insight headers: `text-lg font-medium text-primary`
- Body text: `text-sm text-muted-foreground`

---

## **6. Analytics Integration**

Update `app/(dashboard)/analytics` to show:
- Total Research Projects Completed
- Average Research Time
- Most Common Research Scopes
- Conversion Rate (Action Items → Tasks)

Add to existing Analytics models if needed.

---

## **7. Security & Performance**

### **API Key Management**
- Store Gemini keys encrypted in `UserSettings` table
- Never log or expose keys in responses
- Rate limit research requests (3 concurrent max per user)

### **Caching**
- Cache refined prompts for 7 days (common queries)
- Store scraped sources to avoid re-fetching
- Use Redis for Inngest job state

### **Error Handling**
- Retry failed Inngest steps (3x with exponential backoff)
- Partial results: Save completed steps even if later stages fail
- User notifications via toast + email when research completes

---

## **8. Example User Flow**

**Scenario**: User wants to find local businesses without websites

1. Clicks "🔍 Research Agent" → "New Research"
2. Enters: "Find all gyms in Austin, TX without websites"
3. Selects scope: "Lead Generation"
4. System refines: "Identify fitness centers and gyms in Austin, TX metro area lacking professional websites. Extract contact information, assess digital presence, and generate personalized outreach templates emphasizing website development services."
5. User approves → Research starts (shows progress bar)
6. 10 minutes later: Notification "Research Complete!"
7. Opens research → Sees:
   - 47 leads found
   - Spreadsheet with Name, Phone, Current Digital Presence
   - Suggested DM: "Hi [Name], I noticed [Gym] doesn't have a website..."
8. Clicks "Convert to Client Project"
   - Creates new Project: "Austin Gym Websites"
   - Links to Goal: "Q1 2026 - Land 5 New Clients"
   - Generates Tasks: "Contact [Lead 1]", "Prepare proposal", etc.

---

## **Implementation Checklist**

- [ ] Create database schema in `prisma/schema.prisma`
- [ ] Run `prisma migrate dev` to apply changes
- [ ] Create `server/routers/research.ts` with all tRPC endpoints
- [ ] Set up Inngest background job in `inngest/research-agent.ts`
- [ ] Build UI components in `app/(dashboard)/research/`
- [ ] Add sidebar navigation entry
- [ ] Implement Gemini API integration
- [ ] Add web scraping functionality with Puppeteer
- [ ] Create chart generation system
- [ ] Build PDF export functionality
- [ ] Implement lead extraction and outreach generation
- [ ] Add analytics tracking
- [ ] Set up API key encryption
- [ ] Implement caching layer
- [ ] Add error handling and retry logic
- [ ] Create user notifications
- [ ] Test end-to-end workflows
- [ ] Update documentation

---

This specification maintains Baserow's hierarchical philosophy while adding enterprise-grade research capabilities. Every research output flows naturally into the existing Goal → Project → Task pipeline.
