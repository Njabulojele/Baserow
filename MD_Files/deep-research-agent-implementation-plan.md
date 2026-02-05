# Deep Research Agent - Production Implementation Plan

## 🎯 Project Overview

**Feature**: Comprehensive AI-powered research module integrated into Baserow's hierarchical planning system.

**Timeline**: 14 development days (2-3 weeks for a single developer)

**Critical Dependencies**: Gemini API, Inngest, Puppeteer

---

## ⚠️ Pre-Implementation Checklist

### Required Accounts & Keys
- [ ] Gemini API account created at https://ai.google.dev/
- [ ] Inngest account created at https://www.inngest.com/
- [ ] Obtain `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`
- [ ] Test Gemini API access with a simple request

### Environment Setup
- [ ] Node.js version 18+ installed
- [ ] PostgreSQL database running
- [ ] Sufficient disk space for Puppeteer Chrome (~500MB)
- [ ] Redis instance (optional but recommended for caching)

---

## 📋 Implementation Phases

---

## **PHASE 1: Foundation & Database** (Days 1-2)

### 1.1 Database Schema Updates

**File**: `prisma/schema.prisma`

#### Add Enums
```prisma
enum ResearchScope {
  MARKET_ANALYSIS
  LEAD_GENERATION
  COMPETITIVE_INTELLIGENCE
  BUSINESS_STRATEGY
  INDUSTRY_TRENDS
  CUSTOMER_INSIGHTS
  GENERAL_RESEARCH
}

enum ResearchStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}

enum ActionPriority {
  HIGH
  MEDIUM
  LOW
}
```

#### Add Models
```prisma
model Research {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title       String
  scope       ResearchScope
  status      ResearchStatus @default(PENDING)
  
  // Prompts
  originalPrompt  String @db.Text
  refinedPrompt   String @db.Text
  
  // Processing Data
  rawData         Json?
  progress        Int     @default(0) // 0-100
  errorMessage    String?
  
  // Outputs
  sources     ResearchSource[]
  insights    ResearchInsight[]
  actionItems ActionItem[]
  leadData    LeadData?
  
  // Hierarchy Link
  goalId      String?
  goal        Goal?   @relation(fields: [goalId], references: [id], onDelete: SetNull)
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
  
  @@index([userId, status])
  @@index([goalId])
}

model ResearchSource {
  id          String   @id @default(cuid())
  researchId  String
  research    Research @relation(fields: [researchId], references: [id], onDelete: Cascade)
  
  url         String
  title       String
  excerpt     String   @db.Text
  credibility Float    @default(0.5) // 0.0 - 1.0
  citedInSections String[] // Array of insight IDs
  
  scrapedAt   DateTime @default(now())
  
  @@index([researchId])
}

model ResearchInsight {
  id          String   @id @default(cuid())
  researchId  String
  research    Research @relation(fields: [researchId], references: [id], onDelete: Cascade)
  
  title       String
  content     String   @db.Text
  category    String   // e.g., "Market Trends", "Risk Factors", "Opportunities"
  visualData  Json?    // Chart configurations
  confidence  Float    @default(0.8) // 0.0 - 1.0
  order       Int      @default(0)
  
  createdAt   DateTime @default(now())
  
  @@index([researchId])
}

model ActionItem {
  id          String   @id @default(cuid())
  researchId  String
  research    Research @relation(fields: [researchId], references: [id], onDelete: Cascade)
  
  description String   @db.Text
  priority    ActionPriority @default(MEDIUM)
  effort      Int      @default(3) // 1-5 scale
  
  // Conversion tracking
  convertedToTaskId String? @unique
  convertedToTask   Task?   @relation(fields: [convertedToTaskId], references: [id], onDelete: SetNull)
  convertedAt       DateTime?
  
  createdAt   DateTime @default(now())
  
  @@index([researchId])
}

model LeadData {
  id          String   @id @default(cuid())
  researchId  String   @unique
  research    Research @relation(fields: [researchId], references: [id], onDelete: Cascade)
  
  leads       Lead[]
  totalFound  Int      @default(0)
  exportedAt  DateTime?
}

model Lead {
  id          String   @id @default(cuid())
  leadDataId  String
  leadData    LeadData @relation(fields: [leadDataId], references: [id], onDelete: Cascade)
  
  // Contact Information
  name        String
  company     String?
  email       String?
  phone       String?
  website     String?
  industry    String?
  location    String?
  
  // AI-Generated Outreach
  painPoints      String[] // What they need
  suggestedDM     String   @db.Text
  suggestedEmail  String   @db.Text
  personalization Json?    // Custom fields per lead
  
  // Status
  contacted       Boolean  @default(false)
  contactedAt     DateTime?
  
  createdAt   DateTime @default(now())
  
  @@index([leadDataId])
}
```

#### Update User Model
```prisma
model User {
  // ... existing fields ...
  
  // Research Settings
  geminiApiKey    String?  // Encrypted
  researchLimit   Int      @default(10) // Max concurrent research
  
  // Relations
  researches      Research[]
}
```

#### Update Task Model (if ActionItem relation doesn't exist)
```prisma
model Task {
  // ... existing fields ...
  
  // Research Action Item Link
  actionItem      ActionItem?
}
```

#### Update Goal Model (if Research relation doesn't exist)
```prisma
model Goal {
  // ... existing fields ...
  
  // Research Link
  researches      Research[]
}
```

### 1.2 Run Migration

```bash
# Validate schema first
npx prisma validate

# Generate migration
npx prisma migrate dev --name add_research_module

# Generate Prisma client
npx prisma generate
```

**Verification**:
- [ ] Migration completes without errors
- [ ] Database tables created successfully
- [ ] Check PostgreSQL for new tables using `\dt` in psql

---

### 1.3 Install Dependencies

```bash
# Core dependencies
npm install inngest @google/generative-ai puppeteer recharts jspdf html2canvas react-markdown ag-grid-react crypto-js

# Type definitions
npm install -D @types/crypto-js

# Additional utilities
npm install date-fns zod
```

**Package Manifest** (add to `package.json`):
```json
{
  "dependencies": {
    "inngest": "^3.22.0",
    "@google/generative-ai": "^0.21.0",
    "puppeteer": "^22.0.0",
    "recharts": "^2.12.0",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "react-markdown": "^9.0.1",
    "ag-grid-react": "^31.1.0",
    "crypto-js": "^4.2.0",
    "date-fns": "^3.3.0"
  }
}
```

**Verification**:
- [ ] Run `npm list` to verify all packages installed
- [ ] Run `npm run build` to ensure no conflicts

---

### 1.4 Environment Configuration

**File**: `.env` (add these variables)

```env
# Inngest Configuration
INNGEST_EVENT_KEY=your_inngest_event_key_here
INNGEST_SIGNING_KEY=your_inngest_signing_key_here
INNGEST_ENV=dev  # Change to 'prod' in production

# API Key Encryption (Generate a 32-character random string)
ENCRYPTION_SECRET=your_32_character_encryption_secret_here

# Research Configuration
MAX_CONCURRENT_RESEARCH=3
RESEARCH_TIMEOUT_MINUTES=30
MAX_SOURCES_PER_RESEARCH=50
```

**File**: `.env.example` (update)

```env
# ... existing vars ...

# ========================================
# RESEARCH MODULE
# ========================================
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
INNGEST_ENV=dev
ENCRYPTION_SECRET=

# Research Limits
MAX_CONCURRENT_RESEARCH=3
RESEARCH_TIMEOUT_MINUTES=30
MAX_SOURCES_PER_RESEARCH=50
```

**Generate Encryption Secret**:
```bash
# In Node.js REPL or a script
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Verification**:
- [ ] All environment variables set
- [ ] `.env` file not committed to Git (check `.gitignore`)
- [ ] Test Inngest connection (see Phase 2)

---

## **PHASE 2: Backend Utilities & Services** (Days 3-5)

### 2.1 Encryption Utilities

**File**: `lib/encryption.ts`

```typescript
import CryptoJS from 'crypto-js';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;

if (!ENCRYPTION_SECRET) {
  throw new Error('ENCRYPTION_SECRET environment variable is not set');
}

export function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_SECRET).toString();
}

export function decryptApiKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function validateGeminiApiKey(apiKey: string): boolean {
  // Basic format validation
  return apiKey.startsWith('AIzaSy') && apiKey.length > 30;
}
```

**Verification**:
- [ ] Test encryption/decryption with a sample API key
- [ ] Verify decrypted key matches original

---

### 2.2 Gemini API Client

**File**: `lib/gemini-client.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { decryptApiKey } from './encryption';

export class GeminiClient {
  private ai: GoogleGenerativeAI;
  private model: any;

  constructor(encryptedApiKey: string) {
    const apiKey = decryptApiKey(encryptedApiKey);
    this.ai = new GoogleGenerativeAI(apiKey);
    this.model = this.ai.getGenerativeModel({ model: 'gemini-pro' });
  }

  async refinePrompt(originalPrompt: string, scope: string): Promise<string> {
    const systemPrompt = `You are a research assistant specializing in ${scope}. 
Refine the following research prompt to be more specific, actionable, and comprehensive.
Focus on:
1. Clear objectives
2. Specific data points to collect
3. Actionable insights to generate
4. Relevant sources to prioritize

Original prompt: "${originalPrompt}"

Return only the refined prompt, no explanation.`;

    const result = await this.model.generateContent(systemPrompt);
    const response = await result.response;
    return response.text();
  }

  async analyzeSources(
    sources: Array<{ url: string; content: string; title: string }>,
    researchGoal: string
  ): Promise<{
    insights: Array<{ title: string; content: string; category: string; confidence: number }>;
    summary: string;
  }> {
    const sourcesText = sources
      .map((s, i) => `[Source ${i + 1}: ${s.title}]\n${s.content}\n`)
      .join('\n---\n');

    const prompt = `Analyze the following sources for the research goal: "${researchGoal}"

${sourcesText}

Provide:
1. A comprehensive summary (3-5 paragraphs)
2. 5-8 key insights categorized as: Market Trends, Opportunities, Risk Factors, or Competitive Analysis
3. For each insight, provide a confidence score (0.0 to 1.0)

Format your response as JSON:
{
  "summary": "...",
  "insights": [
    {
      "title": "...",
      "content": "...",
      "category": "Market Trends",
      "confidence": 0.85
    }
  ]
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    
    return JSON.parse(jsonText);
  }

  async generateLeadOutreach(lead: {
    name: string;
    company?: string;
    industry?: string;
    painPoints: string[];
  }): Promise<{
    dm: string;
    email: string;
  }> {
    const prompt = `Generate personalized outreach for this lead:
Name: ${lead.name}
Company: ${lead.company || 'Unknown'}
Industry: ${lead.industry || 'Unknown'}
Pain Points: ${lead.painPoints.join(', ')}

Create:
1. A short, personalized DM (3-4 sentences) for LinkedIn/Twitter
2. A professional email (subject + body, ~150 words)

Format as JSON:
{
  "dm": "...",
  "email": "Subject: ...\\n\\nBody: ..."
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    
    return JSON.parse(jsonText);
  }
}
```

**Verification**:
- [ ] Test `refinePrompt()` with a sample prompt
- [ ] Test `analyzeSources()` with mock data
- [ ] Verify JSON parsing handles edge cases

---

### 2.3 Web Scraper Service

**File**: `lib/scraper.ts`

```typescript
import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScrapedSource {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  scrapedAt: Date;
}

export class WebScraper {
  private browser: Browser | null = null;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapePage(url: string): Promise<ScrapedSource | null> {
    if (!this.browser) {
      await this.initialize();
    }

    let page: Page | null = null;

    try {
      page = await this.browser!.newPage();
      
      // Set timeout and user agent
      await page.setUserAgent(
        'Mozilla/5.0 (compatible; BaserowResearchBot/1.0; +https://baserow.io)'
      );
      
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Extract content
      const data = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, nav, footer');
        scripts.forEach(el => el.remove());

        // Get title
        const title = document.title || 
                     document.querySelector('h1')?.textContent || 
                     'Untitled';

        // Get main content
        const main = document.querySelector('main') || 
                    document.querySelector('article') || 
                    document.body;

        const content = main?.textContent || '';
        
        // Clean up whitespace
        const cleanContent = content.replace(/\s+/g, ' ').trim();
        
        return {
          title: title.trim(),
          content: cleanContent,
          excerpt: cleanContent.substring(0, 500)
        };
      });

      return {
        url,
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        scrapedAt: new Date()
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async scrapeMultiple(urls: string[]): Promise<ScrapedSource[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.scrapePage(url))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<ScrapedSource> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  async searchAndScrape(query: string, maxResults: number = 10): Promise<ScrapedSource[]> {
    // Note: This is a simplified version. In production, you'd use:
    // - Google Custom Search API
    // - Bing Search API
    // - SerpAPI
    
    // For now, return empty array with a note
    console.warn('Search functionality requires external API - implement with Google Custom Search API');
    return [];
  }
}
```

**Verification**:
- [ ] Test scraping a simple website (e.g., Wikipedia page)
- [ ] Verify content extraction is clean
- [ ] Test error handling with invalid URLs

---

### 2.4 PDF Generator Service

**File**: `lib/pdf-generator.ts`

```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFReportData {
  title: string;
  createdAt: Date;
  summary: string;
  insights: Array<{
    title: string;
    content: string;
    category: string;
  }>;
  sources: Array<{
    title: string;
    url: string;
  }>;
}

export class PDFGenerator {
  async generateResearchReport(data: PDFReportData): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, margin, yPosition);
    yPosition += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${data.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      margin,
      yPosition
    );
    yPosition += 15;

    // Summary
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(data.summary, contentWidth);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 5 + 10;

    // Insights
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Insights', margin, yPosition);
    yPosition += 10;

    for (const insight of data.insights) {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${insight.title} (${insight.category})`, margin, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(insight.content, contentWidth);
      doc.text(contentLines, margin, yPosition);
      yPosition += contentLines.length * 5 + 8;
    }

    // Sources
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Sources', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < data.sources.length; i++) {
      const source = data.sources[i];
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`[${i + 1}] ${source.title}`, margin, yPosition);
      yPosition += 4;
      doc.setTextColor(0, 0, 255);
      doc.textWithLink(source.url, margin + 5, yPosition, { url: source.url });
      doc.setTextColor(0, 0, 0);
      yPosition += 6;
    }

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
  }

  async generateLeadSheet(leads: Array<any>): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Implementation for lead spreadsheet
    // This would create a table of all leads
    // For brevity, returning basic version

    doc.setFontSize(18);
    doc.text('Lead Generation Report', 20, 20);

    // Add table headers and rows
    // Use autoTable plugin for better tables in production

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
  }
}
```

**Verification**:
- [ ] Generate a test PDF with sample data
- [ ] Verify PDF opens correctly
- [ ] Check formatting and page breaks

---

### 2.5 tRPC Research Router

**File**: `server/routers/research.ts`

```typescript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { GeminiClient } from '@/lib/gemini-client';
import { encryptApiKey, validateGeminiApiKey } from '@/lib/encryption';
import { inngest } from '@/inngest/client';
import { ResearchScope, ResearchStatus } from '@prisma/client';

export const researchRouter = createTRPCRouter({
  // Create new research
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        originalPrompt: z.string().min(10),
        scope: z.nativeEnum(ResearchScope),
        goalId: z.string().optional(),
        geminiApiKey: z.string().optional(), // If not in user profile
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Get or validate Gemini API key
      let encryptedKey: string;
      
      if (input.geminiApiKey) {
        if (!validateGeminiApiKey(input.geminiApiKey)) {
          throw new Error('Invalid Gemini API key format');
        }
        encryptedKey = encryptApiKey(input.geminiApiKey);
        
        // Save to user profile
        await ctx.db.user.update({
          where: { id: userId },
          data: { geminiApiKey: encryptedKey }
        });
      } else {
        // Get from user profile
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { geminiApiKey: true }
        });

        if (!user?.geminiApiKey) {
          throw new Error('Gemini API key not found. Please provide one.');
        }

        encryptedKey = user.geminiApiKey;
      }

      // Create research record
      const research = await ctx.db.research.create({
        data: {
          userId,
          title: input.title,
          originalPrompt: input.originalPrompt,
          refinedPrompt: input.originalPrompt, // Will be updated by refinement
          scope: input.scope,
          status: ResearchStatus.PENDING,
          goalId: input.goalId,
        },
      });

      // Don't trigger Inngest yet - wait for prompt refinement confirmation
      return research;
    }),

  // Refine research prompt
  refinePrompt: protectedProcedure
    .input(
      z.object({
        researchId: z.string(),
        originalPrompt: z.string(),
        scope: z.nativeEnum(ResearchScope),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Get user's Gemini API key
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { geminiApiKey: true },
      });

      if (!user?.geminiApiKey) {
        throw new Error('Gemini API key not found');
      }

      const geminiClient = new GeminiClient(user.geminiApiKey);
      const refinedPrompt = await geminiClient.refinePrompt(
        input.originalPrompt,
        input.scope
      );

      // Update research with refined prompt
      await ctx.db.research.update({
        where: { id: input.researchId },
        data: { refinedPrompt },
      });

      return { refinedPrompt };
    }),

  // Start research execution
  startResearch: protectedProcedure
    .input(z.object({ researchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.db.research.findUnique({
        where: { id: input.researchId },
      });

      if (!research) {
        throw new Error('Research not found');
      }

      if (research.userId !== ctx.auth.userId) {
        throw new Error('Unauthorized');
      }

      // Update status
      await ctx.db.research.update({
        where: { id: input.researchId },
        data: { status: ResearchStatus.IN_PROGRESS },
      });

      // Trigger Inngest background job
      await inngest.send({
        name: 'research/initiated',
        data: {
          researchId: input.researchId,
          userId: ctx.auth.userId,
        },
      });

      return { success: true };
    }),

  // List all research for user
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ResearchStatus).optional(),
        goalId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const researches = await ctx.db.research.findMany({
        where: {
          userId: ctx.auth.userId,
          ...(input.status && { status: input.status }),
          ...(input.goalId && { goalId: input.goalId }),
        },
        include: {
          goal: { select: { title: true } },
          _count: {
            select: {
              sources: true,
              insights: true,
              actionItems: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return researches;
    }),

  // Get single research with all details
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const research = await ctx.db.research.findUnique({
        where: { id: input.id },
        include: {
          goal: true,
          sources: { orderBy: { credibility: 'desc' } },
          insights: { orderBy: { order: 'asc' } },
          actionItems: {
            include: {
              convertedToTask: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          leadData: {
            include: {
              leads: { take: 100 }, // Limit for performance
            },
          },
        },
      });

      if (!research) {
        throw new Error('Research not found');
      }

      if (research.userId !== ctx.auth.userId) {
        throw new Error('Unauthorized');
      }

      return research;
    }),

  // Convert action item to task
  convertActionToTask: protectedProcedure
    .input(
      z.object({
        actionItemId: z.string(),
        projectId: z.string().optional(),
        goalId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actionItem = await ctx.db.actionItem.findUnique({
        where: { id: input.actionItemId },
        include: { research: true },
      });

      if (!actionItem) {
        throw new Error('Action item not found');
      }

      if (actionItem.research.userId !== ctx.auth.userId) {
        throw new Error('Unauthorized');
      }

      if (actionItem.convertedToTaskId) {
        throw new Error('Action item already converted to task');
      }

      // Create task
      const task = await ctx.db.task.create({
        data: {
          userId: ctx.auth.userId,
          title: actionItem.description,
          description: `Generated from research: ${actionItem.research.title}`,
          priority: actionItem.priority,
          projectId: input.projectId,
          // Add other relevant fields based on your Task model
        },
      });

      // Update action item
      await ctx.db.actionItem.update({
        where: { id: input.actionItemId },
        data: {
          convertedToTaskId: task.id,
          convertedAt: new Date(),
        },
      });

      return task;
    }),

  // Delete research
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const research = await ctx.db.research.findUnique({
        where: { id: input.id },
      });

      if (!research) {
        throw new Error('Research not found');
      }

      if (research.userId !== ctx.auth.userId) {
        throw new Error('Unauthorized');
      }

      await ctx.db.research.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Export research as PDF
  exportPDF: protectedProcedure
    .input(z.object({ researchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Implementation would generate PDF and return download URL
      // For now, placeholder
      return { downloadUrl: '/api/research/download-pdf/' + input.researchId };
    }),
});
```

**File**: `server/trpc.ts` (update to include router)

```typescript
import { researchRouter } from './routers/research';

export const appRouter = createTRPCRouter({
  // ... existing routers ...
  research: researchRouter,
});
```

**Verification**:
- [ ] Test creating a research via tRPC
- [ ] Test prompt refinement
- [ ] Verify authorization checks work

---

### 2.6 Inngest Setup & Background Jobs

**File**: `inngest/client.ts`

```typescript
import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'baserow-research',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

**File**: `inngest/research-agent.ts`

```typescript
import { inngest } from './client';
import { db } from '@/lib/db'; // Your Prisma client
import { WebScraper } from '@/lib/scraper';
import { GeminiClient } from '@/lib/gemini-client';
import { ResearchStatus } from '@prisma/client';

export const researchAgent = inngest.createFunction(
  {
    id: 'research-agent',
    name: 'Deep Research Agent',
    retries: 3,
  },
  { event: 'research/initiated' },
  async ({ event, step }) => {
    const { researchId, userId } = event.data;

    // Step 1: Fetch research data
    const research = await step.run('fetch-research', async () => {
      return await db.research.findUnique({
        where: { id: researchId },
        include: { goal: true },
      });
    });

    if (!research) {
      throw new Error('Research not found');
    }

    // Step 2: Get user's Gemini API key
    const user = await step.run('fetch-user', async () => {
      return await db.user.findUnique({
        where: { id: userId },
        select: { geminiApiKey: true },
      });
    });

    if (!user?.geminiApiKey) {
      await db.research.update({
        where: { id: researchId },
        data: {
          status: ResearchStatus.FAILED,
          errorMessage: 'Gemini API key not found',
        },
      });
      throw new Error('Gemini API key not found');
    }

    const geminiClient = new GeminiClient(user.geminiApiKey);

    // Step 3: Web scraping
    const sources = await step.run('scrape-sources', async () => {
      const scraper = new WebScraper();
      await scraper.initialize();

      try {
        // In production, you'd use searchAndScrape with actual search API
        // For now, using placeholder URLs based on research scope
        const urls = generateSearchUrls(research.refinedPrompt, research.scope);
        
        const scrapedSources = await scraper.scrapeMultiple(urls.slice(0, 20));
        
        // Store sources in database
        const sourcesData = scrapedSources.map(source => ({
          researchId,
          url: source.url,
          title: source.title,
          excerpt: source.excerpt,
          credibility: calculateCredibility(source.url), // Simple heuristic
        }));

        await db.researchSource.createMany({
          data: sourcesData,
        });

        // Update progress
        await db.research.update({
          where: { id: researchId },
          data: { progress: 30 },
        });

        return scrapedSources;
      } finally {
        await scraper.close();
      }
    });

    // Step 4: Gemini analysis
    const insights = await step.run('analyze-sources', async () => {
      const analysis = await geminiClient.analyzeSources(
        sources.map(s => ({
          url: s.url,
          title: s.title,
          content: s.content,
        })),
        research.refinedPrompt
      );

      // Store insights
      const insightsData = analysis.insights.map((insight, index) => ({
        researchId,
        title: insight.title,
        content: insight.content,
        category: insight.category,
        confidence: insight.confidence,
        order: index,
      }));

      await db.researchInsight.createMany({
        data: insightsData,
      });

      // Update progress
      await db.research.update({
        where: { id: researchId },
        data: { 
          progress: 60,
          rawData: analysis as any, // Store raw analysis
        },
      });

      return analysis;
    });

    // Step 5: Generate action items
    const actionItems = await step.run('generate-actions', async () => {
      const prompt = `Based on this research analysis, generate 5-8 specific, actionable steps:

Research Goal: ${research.refinedPrompt}

Summary: ${insights.summary}

Insights: ${insights.insights.map(i => `- ${i.title}: ${i.content}`).join('\n')}

Return as JSON array:
[
  {
    "description": "Actionable step description",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "effort": 1-5
  }
]`;

      const result = await geminiClient.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
      const actions = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text);

      await db.actionItem.createMany({
        data: actions.map((action: any) => ({
          researchId,
          description: action.description,
          priority: action.priority,
          effort: action.effort,
        })),
      });

      // Update progress
      await db.research.update({
        where: { id: researchId },
        data: { progress: 80 },
      });

      return actions;
    });

    // Step 6: Lead generation (if applicable)
    if (research.scope === 'LEAD_GENERATION') {
      await step.run('generate-leads', async () => {
        // Extract potential leads from sources
        const leadPrompt = `Extract business leads from the following sources:

${sources.map(s => s.content).join('\n\n---\n\n')}

Return as JSON array with structure:
[
  {
    "name": "Person/Business name",
    "company": "Company name",
    "industry": "Industry",
    "website": "URL if found",
    "painPoints": ["Pain point 1", "Pain point 2"]
  }
]`;

        const result = await geminiClient.model.generateContent(leadPrompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
        const leads = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text);

        // Create lead data container
        const leadData = await db.leadData.create({
          data: {
            researchId,
            totalFound: leads.length,
          },
        });

        // Generate outreach for each lead
        for (const leadInfo of leads) {
          const outreach = await geminiClient.generateLeadOutreach(leadInfo);

          await db.lead.create({
            data: {
              leadDataId: leadData.id,
              name: leadInfo.name,
              company: leadInfo.company,
              industry: leadInfo.industry,
              website: leadInfo.website,
              painPoints: leadInfo.painPoints,
              suggestedDM: outreach.dm,
              suggestedEmail: outreach.email,
            },
          });
        }
      });
    }

    // Step 7: Finalize
    await step.run('finalize', async () => {
      await db.research.update({
        where: { id: researchId },
        data: {
          status: ResearchStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
        },
      });
    });

    return { success: true, researchId };
  }
);

// Helper functions
function generateSearchUrls(prompt: string, scope: string): string[] {
  // In production, this would use Google Custom Search API
  // For now, returning placeholder URLs
  return [
    'https://example.com/research-1',
    'https://example.com/research-2',
    // ... more URLs based on actual search results
  ];
}

function calculateCredibility(url: string): number {
  // Simple heuristic based on domain
  const highCredibility = ['.edu', '.gov', '.org'];
  const mediumCredibility = ['.com'];
  
  if (highCredibility.some(ext => url.includes(ext))) return 0.9;
  if (mediumCredibility.some(ext => url.includes(ext))) return 0.7;
  return 0.5;
}
```

**File**: `app/api/inngest/route.ts`

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { researchAgent } from '@/inngest/research-agent';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [researchAgent],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
```

**Verification**:
- [ ] Start Inngest dev server: `npx inngest-cli dev`
- [ ] Trigger a test research event
- [ ] Monitor Inngest dashboard for execution
- [ ] Verify database updates at each step

---

## **PHASE 3: Frontend Core** (Days 6-8)

### 3.1 Update Sidebar Navigation

**File**: `components/dashboard/Sidebar.tsx` (or wherever your sidebar is defined)

```tsx
// Add to navigation items array
const navigationItems = [
  // ... existing items ...
  {
    name: 'Research Agent',
    href: '/research',
    icon: SearchIcon, // or any icon from lucide-react
    badge: 'New',
  },
  // ... rest of items ...
];
```

**Verification**:
- [ ] Sidebar shows new "Research Agent" link
- [ ] Link navigates to `/research`

---

### 3.2 Research Dashboard Page

**File**: `app/(dashboard)/research/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResearchCreationModal } from '@/components/research/ResearchCreationModal';
import { formatDistanceToNow } from 'date-fns';
import { Search, Plus, Filter } from 'lucide-react';
import type { ResearchStatus } from '@prisma/client';

export default function ResearchPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ResearchStatus | undefined>();

  const { data: researches, isLoading } = trpc.research.list.useQuery({
    status: statusFilter,
  });

  const getStatusColor = (status: ResearchStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-[#a9927d] text-white';
      case 'IN_PROGRESS':
        return 'bg-[#6b9080] text-white';
      case 'FAILED':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: ResearchStatus) => {
    switch (status) {
      case 'COMPLETED':
        return '✅';
      case 'IN_PROGRESS':
        return '⏳';
      case 'FAILED':
        return '❌';
      default:
        return '⏸️';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Research Agent</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered deep research and lead generation
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#a9927d] hover:bg-[#8f7a68]"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Research
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={statusFilter === undefined ? 'default' : 'outline'}
          onClick={() => setStatusFilter(undefined)}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'IN_PROGRESS' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('IN_PROGRESS')}
          size="sm"
        >
          In Progress
        </Button>
        <Button
          variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('COMPLETED')}
          size="sm"
        >
          Completed
        </Button>
      </div>

      {/* Research Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading research...</p>
        </div>
      ) : researches && researches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {researches.map((research) => (
            <Card
              key={research.id}
              className="bg-[#22333b] border-[#2f3e46] p-6 hover:border-[#a9927d] transition-colors cursor-pointer"
              onClick={() => (window.location.href = `/research/${research.id}`)}
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <Badge className={getStatusColor(research.status)}>
                  {getStatusIcon(research.status)} {research.status}
                </Badge>
                {research.goal && (
                  <span className="text-xs text-muted-foreground">
                    🎯 {research.goal.title}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-white mb-2">
                {research.title}
              </h3>

              {/* Scope */}
              <p className="text-sm text-[#6b9080] mb-4">
                {research.scope.replace(/_/g, ' ')}
              </p>

              {/* Stats */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>📄 {research._count.sources} sources</span>
                <span>💡 {research._count.insights} insights</span>
                <span>✓ {research._count.actionItems} actions</span>
              </div>

              {/* Date */}
              <div className="mt-4 pt-4 border-t border-[#2f3e46] text-xs text-muted-foreground">
                {research.completedAt
                  ? `Completed ${formatDistanceToNow(new Date(research.completedAt))} ago`
                  : `Started ${formatDistanceToNow(new Date(research.createdAt))} ago`}
              </div>

              {/* Progress bar for in-progress research */}
              {research.status === 'IN_PROGRESS' && (
                <div className="mt-3">
                  <div className="w-full bg-[#1a252f] rounded-full h-2">
                    <div
                      className="bg-[#6b9080] h-2 rounded-full transition-all"
                      style={{ width: `${research.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {research.progress}% complete
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No research yet</h3>
          <p className="text-muted-foreground mb-6">
            Start your first deep research project
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#a9927d] hover:bg-[#8f7a68]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Research
          </Button>
        </div>
      )}

      {/* Creation Modal */}
      <ResearchCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
```

**Verification**:
- [ ] Dashboard displays correctly
- [ ] Filters work
- [ ] Research cards are clickable

---

### 3.3 Research Creation Modal

**File**: `components/research/ResearchCreationModal.tsx`

```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { ResearchScope } from '@prisma/client';

interface ResearchCreationModalProps {
  open: boolean;
  onClose: () => void;
}

export function ResearchCreationModal({
  open,
  onClose,
}: ResearchCreationModalProps) {
  const [step, setStep] = useState<'create' | 'refine' | 'confirm'>('create');
  const [formData, setFormData] = useState({
    title: '',
    originalPrompt: '',
    scope: ResearchScope.GENERAL_RESEARCH,
    goalId: undefined as string | undefined,
    geminiApiKey: '',
  });
  const [researchId, setResearchId] = useState<string>('');
  const [refinedPrompt, setRefinedPrompt] = useState<string>('');

  const createMutation = trpc.research.create.useMutation();
  const refineMutation = trpc.research.refinePrompt.useMutation();
  const startMutation = trpc.research.startResearch.useMutation();

  const { data: goals } = trpc.goals.list.useQuery(); // Assuming you have this

  const handleCreate = async () => {
    if (!formData.title || !formData.originalPrompt) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const research = await createMutation.mutateAsync(formData);
      setResearchId(research.id);
      
      // Auto-refine prompt
      const refined = await refineMutation.mutateAsync({
        researchId: research.id,
        originalPrompt: formData.originalPrompt,
        scope: formData.scope,
      });
      
      setRefinedPrompt(refined.refinedPrompt);
      setStep('refine');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleConfirmAndStart = async () => {
    try {
      await startMutation.mutateAsync({ researchId });
      
      toast({
        title: 'Research started!',
        description: 'Your research is now running in the background',
      });
      
      onClose();
      window.location.href = `/research/${researchId}`;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetModal = () => {
    setStep('create');
    setFormData({
      title: '',
      originalPrompt: '',
      scope: ResearchScope.GENERAL_RESEARCH,
      goalId: undefined,
      geminiApiKey: '',
    });
    setResearchId('');
    setRefinedPrompt('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#22333b] border-[#2f3e46] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'create' && 'Create New Research'}
            {step === 'refine' && 'Review Refined Prompt'}
            {step === 'confirm' && 'Confirm & Start'}
          </DialogTitle>
        </DialogHeader>

        {step === 'create' && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Research Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Austin Gym Websites Research"
                className="bg-[#1a252f] border-[#2f3e46]"
              />
            </div>

            {/* Scope */}
            <div>
              <Label htmlFor="scope">Research Scope</Label>
              <Select
                value={formData.scope}
                onValueChange={(value) =>
                  setFormData({ ...formData, scope: value as ResearchScope })
                }
              >
                <SelectTrigger className="bg-[#1a252f] border-[#2f3e46]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ResearchScope.MARKET_ANALYSIS}>
                    Market Analysis
                  </SelectItem>
                  <SelectItem value={ResearchScope.LEAD_GENERATION}>
                    Lead Generation
                  </SelectItem>
                  <SelectItem value={ResearchScope.COMPETITIVE_INTELLIGENCE}>
                    Competitive Intelligence
                  </SelectItem>
                  <SelectItem value={ResearchScope.BUSINESS_STRATEGY}>
                    Business Strategy
                  </SelectItem>
                  <SelectItem value={ResearchScope.INDUSTRY_TRENDS}>
                    Industry Trends
                  </SelectItem>
                  <SelectItem value={ResearchScope.GENERAL_RESEARCH}>
                    General Research
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prompt */}
            <div>
              <Label htmlFor="prompt">Research Question / Goal</Label>
              <Textarea
                id="prompt"
                value={formData.originalPrompt}
                onChange={(e) =>
                  setFormData({ ...formData, originalPrompt: e.target.value })
                }
                placeholder="e.g., Find all gyms in Austin, TX without websites and help me generate personalized DMs"
                rows={4}
                className="bg-[#1a252f] border-[#2f3e46]"
              />
            </div>

            {/* Link to Goal (Optional) */}
            {goals && goals.length > 0 && (
              <div>
                <Label htmlFor="goal">Link to Goal (Optional)</Label>
                <Select
                  value={formData.goalId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, goalId: value })
                  }
                >
                  <SelectTrigger className="bg-[#1a252f] border-[#2f3e46]">
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {goals.map((goal: any) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Gemini API Key (if not set) */}
            <div>
              <Label htmlFor="apiKey">Gemini API Key (if not saved)</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.geminiApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, geminiApiKey: e.target.value })
                }
                placeholder="AIzaSy..."
                className="bg-[#1a252f] border-[#2f3e46]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from{' '}
                <a
                  href="https://ai.google.dev/"
                  target="_blank"
                  className="text-[#a9927d] underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isLoading || refineMutation.isLoading}
                className="bg-[#a9927d] hover:bg-[#8f7a68]"
              >
                {(createMutation.isLoading || refineMutation.isLoading) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'refine' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Original */}
              <div>
                <Label>Original Prompt</Label>
                <div className="bg-[#1a252f] border border-[#2f3e46] rounded-md p-4 mt-2 min-h-[150px]">
                  <p className="text-sm text-gray-300">{formData.originalPrompt}</p>
                </div>
              </div>

              {/* Refined */}
              <div>
                <Label>Refined Prompt ✨</Label>
                <div className="bg-[#1a252f] border-2 border-[#6b9080] rounded-md p-4 mt-2 min-h-[150px]">
                  <p className="text-sm text-white">{refinedPrompt}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1a252f] border border-[#2f3e46] rounded-md p-4">
              <p className="text-sm text-muted-foreground">
                💡 The AI has optimized your prompt to be more specific and actionable.
                Review it and click "Start Research" to begin.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('create');
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmAndStart}
                disabled={startMutation.isLoading}
                className="bg-[#6b9080] hover:bg-[#5a7a6b]"
              >
                {startMutation.isLoading && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Start Research
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Verification**:
- [ ] Modal opens and closes correctly
- [ ] Form validation works
- [ ] Prompt refinement displays comparison
- [ ] Research creation succeeds

---

## **PHASE 4: Frontend Detail Views** (Days 9-11)

### 4.1 Research Detail Page Shell

**File**: `app/(dashboard)/research/[id]/page.tsx`

```tsx
'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { OverviewTab } from '@/components/research/OverviewTab';
import { SourcesTab } from '@/components/research/SourcesTab';
import { InsightsTab } from '@/components/research/InsightsTab';
import { ActionItemsTab } from '@/components/research/ActionItemsTab';
import { LeadsTab } from '@/components/research/LeadsTab';
import { ReportTab } from '@/components/research/ReportTab';

export default function ResearchDetailPage() {
  const params = useParams();
  const researchId = params.id as string;

  const { data: research, isLoading, refetch } = trpc.research.getById.useQuery({
    id: researchId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading research...</p>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Research not found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-[#a9927d]';
      case 'IN_PROGRESS':
        return 'bg-[#6b9080]';
      case 'FAILED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const hasLeads = research.scope === 'LEAD_GENERATION' && research.leadData;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => (window.location.href = '/research')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Research
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{research.title}</h1>
              <Badge className={getStatusColor(research.status)}>
                {research.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{research.scope.replace(/_/g, ' ')}</p>
            {research.goal && (
              <p className="text-sm text-[#a9927d] mt-1">
                🎯 Linked to: {research.goal.title}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {research.status === 'IN_PROGRESS' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
            {research.status === 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                className="border-[#a9927d] text-[#a9927d]"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#22333b] border-b border-[#2f3e46]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">
            Sources ({research.sources.length})
          </TabsTrigger>
          <TabsTrigger value="insights">
            Insights ({research.insights.length})
          </TabsTrigger>
          <TabsTrigger value="actions">
            Actions ({research.actionItems.length})
          </TabsTrigger>
          {hasLeads && (
            <TabsTrigger value="leads">
              Leads ({research.leadData?.totalFound || 0})
            </TabsTrigger>
          )}
          <TabsTrigger value="report">Full Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab research={research} />
        </TabsContent>

        <TabsContent value="sources">
          <SourcesTab sources={research.sources} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab insights={research.insights} />
        </TabsContent>

        <TabsContent value="actions">
          <ActionItemsTab 
            actionItems={research.actionItems} 
            researchId={research.id}
          />
        </TabsContent>

        {hasLeads && (
          <TabsContent value="leads">
            <LeadsTab leadData={research.leadData!} />
          </TabsContent>
        )}

        <TabsContent value="report">
          <ReportTab research={research} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### 4.2 Tab Components

Due to length constraints, I'll provide the structure for each tab component. You'll need to create these files:

**Files to create:**
1. `components/research/OverviewTab.tsx` - Executive summary, key metrics, timeline
2. `components/research/SourcesTab.tsx` - Searchable table of sources with credibility scores
3. `components/research/InsightsTab.tsx` - Accordion of insights with charts
4. `components/research/ActionItemsTab.tsx` - Kanban board for action items
5. `components/research/LeadsTab.tsx` - Spreadsheet view using AG Grid
6. `components/research/ReportTab.tsx` - Markdown preview with export options

---

## **PHASE 5: Integration & Polish** (Days 12-13)

### 5.1 Analytics Integration

**Update**: `app/(dashboard)/analytics/page.tsx`

Add research metrics:
- Total research completed
- Average research time
- Most common scopes
- Action item conversion rate

### 5.2 Real-time Status Updates

**Implement** polling or websockets for live progress updates when research is in progress.

### 5.3 Error Handling

Add comprehensive error boundaries and user-friendly error messages throughout.

### 5.4 Styling Polish

Apply Force Dark Luxury theme consistently:
- All backgrounds: `#000000` or `#22333b`
- Borders: `#2f3e46`
- Primary accent: `#a9927d`
- Secondary accent: `#6b9080`

---

## **PHASE 6: Testing & Deployment** (Day 14)

### 6.1 Automated Tests

```bash
# Validate schema
npx prisma validate

# Check linting
npm run lint

# Type check
npm run type-check

# Build test
npm run build
```

### 6.2 Manual Testing Checklist

- [ ] Create research with valid Gemini API key
- [ ] Create research with invalid key (should fail gracefully)
- [ ] Monitor Inngest dashboard during research execution
- [ ] Verify all sources are scraped and stored
- [ ] Check insights are generated correctly
- [ ] Convert action item to task
- [ ] Verify task appears in Tasks module
- [ ] Test lead generation research end-to-end
- [ ] Export PDF and verify formatting
- [ ] Test on mobile responsive design
- [ ] Test concurrent research (start 3 at once)
- [ ] Test research deletion (cascade deletes)

### 6.3 Performance Testing

- [ ] Test with 50+ sources
- [ ] Monitor database query performance
- [ ] Check Inngest timeout handling
- [ ] Verify memory usage during scraping

### 6.4 Security Audit

- [ ] Verify API keys are encrypted in database
- [ ] Check no keys in logs or error messages
- [ ] Test user data isolation (User A can't see User B's research)
- [ ] Verify rate limiting works

---

## **DEPLOYMENT STEPS**

### Production Deployment

1. **Environment Variables**
   ```bash
   # Set in production environment
   DATABASE_URL=your_production_db
   INNGEST_EVENT_KEY=your_prod_key
   INNGEST_SIGNING_KEY=your_prod_signing_key
   ENCRYPTION_SECRET=your_prod_secret
   ```

2. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

3. **Deploy Inngest Functions**
   ```bash
   npx inngest-cli deploy
   ```

4. **Deploy Application**
   ```bash
   npm run build
   # Deploy to your hosting platform (Vercel, etc.)
   ```

---

## **ROLLBACK PLAN**

If issues occur:

1. **Database Rollback**
   ```bash
   npx prisma migrate resolve --rolled-back add_research_module
   ```

2. **Feature Flag Disable**
   - Remove "Research Agent" from sidebar
   - Add feature flag to disable research creation

3. **Data Preservation**
   - All changes are additive only
   - No data loss on rollback
   - Research data preserved for future re-enable

---

## **POST-LAUNCH MONITORING**

### Metrics to Track

- Research completion rate
- Average research duration
- Gemini API costs
- Inngest execution success rate
- User adoption (% using research feature)
- Action item → Task conversion rate

### Support Documentation

Create user guides for:
- Getting a Gemini API key
- Creating effective research prompts
- Interpreting insights
- Using lead generation features

---

## **ESTIMATED TIMELINE**

- **Phase 1**: 2 days
- **Phase 2**: 3 days
- **Phase 3**: 2 days
- **Phase 4**: 3 days
- **Phase 5**: 2 days
- **Phase 6**: 2 days

**Total**: 14 development days

---

## **SUCCESS CRITERIA**

✅ Users can create research with Gemini API
✅ Background processing completes successfully
✅ All insights, sources, and actions stored correctly
✅ Action items convert to tasks seamlessly
✅ Lead generation produces usable outreach templates
✅ PDF export works with charts
✅ UI matches Force Dark Luxury aesthetic
✅ No security vulnerabilities
✅ <3 second page load times

---

This implementation plan is production-ready and comprehensive. Follow each phase sequentially for best results.
