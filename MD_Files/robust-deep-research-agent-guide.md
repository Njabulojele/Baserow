# Building a Robust Deep Research Agent

## Executive Summary

This guide transforms your basic research agent into a powerful intelligence system that:
- Scrapes multiple source types (Reddit, HN, academic, news)
- Extracts real pain points from discussions
- Validates insights across sources
- Produces truly actionable intelligence

## Table of Contents

1. [Core Problems with Current Implementation](#core-problems)
2. [Architecture Upgrades](#architecture-upgrades)
3. [Multi-Source Scraping Engine](#multi-source-scraping)
4. [Intelligent Source Discovery](#source-discovery)
5. [Deep Analysis Engine](#analysis-engine)
6. [Validation Framework](#validation-framework)
7. [Database Schema Updates](#schema-updates)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Core Problems with Current Implementation {#core-problems}

Your current agent likely suffers from:

1. **Shallow scraping** - Single-pass extraction misses dynamic content
2. **Poor source diversity** - Missing Reddit, forums, academic papers, social signals
3. **Weak analysis** - Generic AI prompts don't extract actionable intelligence
4. **No validation loop** - Insights aren't tested for business viability

---

## Architecture Upgrades {#architecture-upgrades}

### Enhanced Data Flow

```
User Prompt
    ↓
AI Refinement (Gemini)
    ↓
Multi-Source Discovery
    ├─→ Google Search (authoritative)
    ├─→ Reddit Scraper (pain points, real feedback)
    ├─→ Hacker News (technical validation)
    ├─→ Academic (research backing)
    └─→ News APIs (trends)
    ↓
Source Ranking & Selection
    ↓
Deep Scraping (including comments)
    ↓
Multi-Pass Analysis
    ├─→ Market Analysis
    ├─→ Pain Point Extraction
    ├─→ Opportunity Identification
    ├─→ Competitor Analysis
    └─→ Risk Assessment
    ↓
Insight Validation Loop
    ↓
Actionability Scoring
    ↓
Structured Output (Insights, Actions, Leads)
```

---

## Multi-Source Scraping Engine {#multi-source-scraping}

### File Structure

```
lib/scrapers/
├── index.ts                 # Scraper registry
├── base-scraper.ts          # Abstract base class
├── reddit-scraper.ts        # Reddit implementation
├── hackernews-scraper.ts    # HN implementation
├── google-scholar-scraper.ts
├── news-api-scraper.ts
└── generic-scraper.ts       # Puppeteer fallback
```

### 1. Scraper Registry

**File:** `lib/scrapers/index.ts`

```typescript
import { RedditScraper } from './reddit-scraper'
import { HackerNewsScraper } from './hackernews-scraper'
import { GoogleScholarScraper } from './google-scholar-scraper'
import { NewsAPIScraper } from './news-api-scraper'
import { GenericScraper } from './generic-scraper'

export const scrapers = {
  reddit: new RedditScraper(),
  hn: new HackerNewsScraper(),
  academic: new GoogleScholarScraper(),
  news: new NewsAPIScraper(),
  generic: new GenericScraper()
}

export interface ScrapedSource {
  title: string
  url: string
  content: string
  sourceType: 'reddit' | 'hn' | 'academic' | 'news' | 'web'
  metadata: {
    author?: string
    date?: Date
    score?: number
    comments?: number
    engagement?: any
  }
  topComments?: Comment[]
}

export interface Comment {
  author: string
  text: string
  score: number
  depth: number
  created: Date
}
```

### 2. Reddit Scraper (The Crown Jewel)

**File:** `lib/scrapers/reddit-scraper.ts`

```typescript
import puppeteer, { Browser, Page } from 'puppeteer'

export interface RedditScraperOptions {
  subreddits?: string[]
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
  sortBy?: 'relevance' | 'hot' | 'top' | 'new' | 'comments'
  minScore?: number
  maxResults?: number
  scrapeComments?: boolean
  maxCommentsPerPost?: number
}

export class RedditScraper {
  private browser: Browser | null = null

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      })
    }
  }

  async scrape(query: string, options: RedditScraperOptions = {}) {
    await this.initialize()

    const {
      subreddits = [],
      timeRange = 'month',
      sortBy = 'relevance',
      minScore = 10,
      maxResults = 20,
      scrapeComments = true,
      maxCommentsPerPost = 10
    } = options

    // Build Reddit search URL
    const subredditParam = subreddits.length 
      ? `subreddit:${subreddits.join('+subreddit:')}`
      : ''
    
    const searchQuery = subredditParam 
      ? `${query} ${subredditParam}`
      : query

    const url = `https://www.reddit.com/search/?q=${encodeURIComponent(searchQuery)}&sort=${sortBy}&t=${timeRange}`

    console.log(`🔍 Searching Reddit: ${url}`)

    const page = await this.browser!.newPage()
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

      // Wait for content to load
      await page.waitForSelector('[data-testid="post-container"]', { timeout: 10000 })

      // Scroll to load more results
      await this.autoScroll(page, maxResults)

      // Extract post data
      const posts = await page.evaluate((minScore) => {
        const posts: any[] = []
        
        document.querySelectorAll('[data-testid="post-container"]').forEach(postEl => {
          try {
            const titleEl = postEl.querySelector('h3')
            const linkEl = postEl.querySelector('a[data-click-id="body"]')
            const scoreEl = postEl.querySelector('[id^="vote-arrows-"]')
            const commentsEl = postEl.querySelector('a[data-click-id="comments"]')
            const subredditEl = postEl.querySelector('a[data-click-id="subreddit"]')
            const authorEl = postEl.querySelector('a[data-click-id="author"]')
            const timeEl = postEl.querySelector('a[data-click-id="timestamp"]')
            
            const scoreText = scoreEl?.textContent?.trim() || '0'
            const score = scoreText === 'Vote' ? 0 : parseInt(scoreText.replace(/[^0-9-]/g, '')) || 0
            
            if (score < minScore) return

            const commentsText = commentsEl?.textContent?.trim() || '0'
            const numComments = parseInt(commentsText.replace(/[^0-9]/g, '')) || 0

            posts.push({
              title: titleEl?.textContent?.trim() || '',
              url: linkEl?.href || '',
              score: score,
              numComments: numComments,
              subreddit: subredditEl?.textContent?.trim() || '',
              author: authorEl?.textContent?.trim() || '',
              timestamp: timeEl?.getAttribute('href') || '',
              // Try to get preview text
              preview: postEl.querySelector('[data-click-id="text"]')?.textContent?.trim() || ''
            })
          } catch (err) {
            console.error('Error parsing post:', err)
          }
        })
        
        return posts
      }, minScore)

      console.log(`📊 Found ${posts.length} posts matching criteria`)

      // Scrape comments for high-value posts
      let enrichedPosts = posts

      if (scrapeComments && posts.length > 0) {
        console.log(`💬 Scraping comments from top posts...`)
        
        // Take top posts by score
        const topPosts = posts
          .sort((a, b) => b.score - a.score)
          .slice(0, Math.min(10, maxResults))

        enrichedPosts = await Promise.all(
          topPosts.map(async (post) => {
            try {
              const comments = await this.scrapeComments(post.url, maxCommentsPerPost)
              return { ...post, topComments: comments }
            } catch (err) {
              console.error(`Failed to scrape comments for ${post.url}:`, err)
              return { ...post, topComments: [] }
            }
          })
        )
      }

      await page.close()

      // Calculate sentiment
      const sentiment = this.analyzeSentiment(enrichedPosts)

      return {
        posts: enrichedPosts,
        metadata: {
          totalResults: enrichedPosts.length,
          avgScore: this.average(enrichedPosts.map(p => p.score)),
          avgComments: this.average(enrichedPosts.map(p => p.numComments)),
          sentiment: sentiment,
          subreddits: [...new Set(enrichedPosts.map(p => p.subreddit))],
          searchUrl: url
        }
      }

    } catch (error) {
      await page.close()
      throw error
    }
  }

  async scrapeComments(postUrl: string, maxComments: number = 10): Promise<Comment[]> {
    const page = await this.browser!.newPage()
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      
      // Sort by "best" to get highest quality comments
      const sortedUrl = postUrl.includes('?') 
        ? `${postUrl}&sort=best`
        : `${postUrl}?sort=best`
      
      await page.goto(sortedUrl, { waitUntil: 'networkidle2', timeout: 30000 })

      // Wait for comments to load
      await page.waitForSelector('[data-testid="comment"]', { timeout: 10000 })

      // Extract comments
      const comments = await page.evaluate((maxComments) => {
        const comments: any[] = []
        
        document.querySelectorAll('[data-testid="comment"]').forEach((commentEl, index) => {
          if (index >= maxComments) return

          try {
            const authorEl = commentEl.querySelector('a[data-testid="comment_author_link"]')
            const textEl = commentEl.querySelector('[data-testid="comment"]')
            const scoreEl = commentEl.querySelector('[id^="vote-arrows-"]')
            
            const scoreText = scoreEl?.textContent?.trim() || '0'
            const score = parseInt(scoreText.replace(/[^0-9-]/g, '')) || 0

            // Get the actual comment text (excluding nested comments)
            const textContent = Array.from(textEl?.childNodes || [])
              .filter(node => node.nodeType === Node.TEXT_NODE || (node.nodeName === 'P'))
              .map(node => node.textContent)
              .join(' ')
              .trim()

            if (textContent.length > 10) {
              comments.push({
                author: authorEl?.textContent?.trim() || 'unknown',
                text: textContent,
                score: score,
                depth: 0 // Could calculate depth from DOM structure
              })
            }
          } catch (err) {
            console.error('Error parsing comment:', err)
          }
        })
        
        return comments
      }, maxComments)

      await page.close()
      
      return comments.sort((a, b) => b.score - a.score)

    } catch (error) {
      await page.close()
      console.error('Error scraping comments:', error)
      return []
    }
  }

  private async autoScroll(page: Page, maxResults: number) {
    await page.evaluate(async (maxResults) => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0
        const distance = 100
        const maxScrolls = Math.ceil(maxResults / 5) // ~5 posts per scroll
        let scrolls = 0

        const timer = setInterval(() => {
          const scrollHeight = document.documentElement.scrollHeight
          window.scrollBy(0, distance)
          totalHeight += distance
          scrolls++

          if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
            clearInterval(timer)
            resolve()
          }
        }, 200)
      })
    }, maxResults)

    // Wait for any lazy-loaded content
    await page.waitForTimeout(1000)
  }

  private analyzeSentiment(posts: any[]): string {
    // Simple sentiment analysis based on keywords in titles/content
    const positiveKeywords = ['great', 'awesome', 'love', 'best', 'excellent', 'amazing', 'recommend']
    const negativeKeywords = ['terrible', 'awful', 'hate', 'worst', 'disappointed', 'frustrated', 'problem']

    let positiveCount = 0
    let negativeCount = 0

    posts.forEach(post => {
      const text = (post.title + ' ' + post.preview).toLowerCase()
      
      positiveKeywords.forEach(keyword => {
        if (text.includes(keyword)) positiveCount++
      })
      
      negativeKeywords.forEach(keyword => {
        if (text.includes(keyword)) negativeCount++
      })
    })

    if (positiveCount > negativeCount * 1.5) return 'positive'
    if (negativeCount > positiveCount * 1.5) return 'negative'
    return 'neutral'
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}
```

### 3. Hacker News Scraper

**File:** `lib/scrapers/hackernews-scraper.ts`

```typescript
import axios from 'axios'

export class HackerNewsScraper {
  private readonly API_BASE = 'https://hn.algolia.com/api/v1'

  async search(query: string, options: {
    tags?: string[]
    numericFilters?: string[]
    hitsPerPage?: number
  } = {}) {
    const { tags = [], numericFilters = [], hitsPerPage = 20 } = options

    try {
      const response = await axios.get(`${this.API_BASE}/search`, {
        params: {
          query,
          tags: tags.join(','),
          numericFilters: numericFilters.join(','),
          hitsPerPage
        }
      })

      const hits = response.data.hits

      // Fetch comments for top stories
      const enrichedHits = await Promise.all(
        hits.slice(0, 10).map(async (hit: any) => {
          const comments = await this.fetchComments(hit.objectID)
          return {
            ...hit,
            topComments: comments
          }
        })
      )

      return {
        stories: enrichedHits.map((hit: any) => ({
          title: hit.title,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          points: hit.points,
          author: hit.author,
          numComments: hit.num_comments,
          created: new Date(hit.created_at),
          topComments: hit.topComments
        })),
        metadata: {
          totalResults: response.data.nbHits,
          processingTime: response.data.processingTimeMS
        }
      }
    } catch (error) {
      console.error('HN scraping error:', error)
      return { stories: [], metadata: {} }
    }
  }

  private async fetchComments(storyId: string) {
    try {
      const response = await axios.get(`${this.API_BASE}/items/${storyId}`)
      const story = response.data

      if (!story.children || story.children.length === 0) {
        return []
      }

      // Extract top-level comments
      return story.children
        .slice(0, 5)
        .map((comment: any) => ({
          author: comment.author,
          text: this.stripHtml(comment.text || ''),
          created: new Date(comment.created_at)
        }))
        .filter((c: any) => c.text.length > 20)
    } catch (error) {
      return []
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  }
}
```

### 4. Generic Puppeteer Scraper

**File:** `lib/scrapers/generic-scraper.ts`

```typescript
import puppeteer from 'puppeteer'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export class GenericScraper {
  async scrape(url: string): Promise<{
    title: string
    content: string
    author?: string
    publishDate?: Date
  }> {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      
      const html = await page.content()
      
      // Use Readability to extract main content
      const dom = new JSDOM(html, { url })
      const reader = new Readability(dom.window.document)
      const article = reader.parse()

      await browser.close()

      if (!article) {
        throw new Error('Failed to parse article content')
      }

      return {
        title: article.title,
        content: article.textContent,
        author: article.byline || undefined,
        publishDate: undefined // Could extract from metadata
      }
    } catch (error) {
      await browser.close()
      throw error
    }
  }
}
```

---

## Intelligent Source Discovery {#source-discovery}

### Dynamic Source Discovery System

**File:** `lib/research/source-discovery.ts`

```typescript
import { scrapers, ScrapedSource } from '../scrapers'
import { geminiClient } from '../gemini-client'

export interface ResearchContext {
  prompt: string
  industry?: string
  targetAudience?: string
  geography?: string
  timeframe?: string
}

export class SourceDiscovery {
  async discover(context: ResearchContext) {
    console.log('🔍 Starting multi-source discovery...')

    // Step 1: Find relevant subreddits dynamically
    const subreddits = await this.findRelevantSubreddits(context.prompt)

    // Step 2: Execute searches across all sources in parallel
    const [redditResults, hnResults, webResults] = await Promise.all([
      this.searchReddit(context.prompt, subreddits),
      this.searchHackerNews(context.prompt),
      this.searchWeb(context.prompt)
    ])

    // Step 3: Combine and rank all sources
    const allSources = [
      ...redditResults,
      ...hnResults,
      ...webResults
    ]

    const rankedSources = await this.rankSources(allSources, context.prompt)

    // Step 4: Diversify - take top N from each category
    return {
      realWorld: rankedSources.filter(s => s.sourceType === 'reddit').slice(0, 8),
      technical: rankedSources.filter(s => s.sourceType === 'hn').slice(0, 5),
      web: rankedSources.filter(s => s.sourceType === 'web').slice(0, 5),
      all: rankedSources.slice(0, 20)
    }
  }

  private async findRelevantSubreddits(topic: string): Promise<string[]> {
    const prompt = `Given this research topic: "${topic}"

Suggest 3-5 highly relevant, active subreddits where people discuss this topic.

Return ONLY a JSON array of subreddit names (without r/), e.g., ["technology", "startups"]

Focus on:
- Active communities
- Mix of general and niche subreddits
- Where pain points and real experiences are discussed

Subreddits:`

    const response = await geminiClient.generate(prompt)
    
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[.*\]/s)
      if (jsonMatch) {
        const subreddits = JSON.parse(jsonMatch[0])
        console.log(`📍 Identified subreddits: ${subreddits.join(', ')}`)
        return subreddits
      }
    } catch (error) {
      console.error('Failed to parse subreddits:', error)
    }

    // Fallback to general subreddits
    return ['technology', 'business', 'entrepreneur']
  }

  private async searchReddit(query: string, subreddits: string[]) {
    const redditData = await scrapers.reddit.scrape(query, {
      subreddits,
      timeRange: 'month',
      sortBy: 'top',
      minScore: 20,
      maxResults: 30,
      scrapeComments: true,
      maxCommentsPerPost: 15
    })

    return redditData.posts.map(post => ({
      title: post.title,
      url: post.url,
      content: post.preview,
      sourceType: 'reddit' as const,
      metadata: {
        author: post.author,
        date: new Date(),
        score: post.score,
        comments: post.numComments,
        subreddit: post.subreddit,
        engagement: {
          upvotes: post.score,
          commentCount: post.numComments
        }
      },
      topComments: post.topComments?.map(c => ({
        author: c.author,
        text: c.text,
        score: c.score,
        depth: c.depth,
        created: new Date()
      }))
    }))
  }

  private async searchHackerNews(query: string) {
    const hnData = await scrapers.hn.search(query, {
      tags: ['story'],
      numericFilters: ['points>20'],
      hitsPerPage: 20
    })

    return hnData.stories.map(story => ({
      title: story.title,
      url: story.url,
      content: '',
      sourceType: 'hn' as const,
      metadata: {
        author: story.author,
        date: story.created,
        score: story.points,
        comments: story.numComments,
        engagement: {
          points: story.points,
          commentCount: story.numComments
        }
      },
      topComments: story.topComments?.map(c => ({
        author: c.author,
        text: c.text,
        score: 0,
        depth: 0,
        created: c.created
      }))
    }))
  }

  private async searchWeb(query: string): Promise<ScrapedSource[]> {
    // Implement web search via Google Custom Search API or similar
    // For now, return empty array
    return []
  }

  private async rankSources(sources: ScrapedSource[], query: string) {
    console.log(`📊 Ranking ${sources.length} sources...`)

    const scored = await Promise.all(
      sources.map(async (source) => {
        const score = await this.scoreSource(source, query)
        return { ...source, score }
      })
    )

    return scored.sort((a, b) => b.score - a.score)
  }

  private async scoreSource(source: ScrapedSource, query: string): Promise<number> {
    let score = 0

    // Recency (max 25 points)
    if (source.metadata.date) {
      const daysOld = (Date.now() - source.metadata.date.getTime()) / (1000 * 60 * 60 * 24)
      if (daysOld < 7) score += 25
      else if (daysOld < 30) score += 20
      else if (daysOld < 90) score += 15
      else if (daysOld < 180) score += 10
      else score += 5
    }

    // Engagement (max 25 points)
    if (source.metadata.score) {
      if (source.sourceType === 'reddit') {
        if (source.metadata.score > 500) score += 25
        else if (source.metadata.score > 200) score += 20
        else if (source.metadata.score > 100) score += 15
        else if (source.metadata.score > 50) score += 10
        else score += 5
      } else if (source.sourceType === 'hn') {
        if (source.metadata.score > 200) score += 25
        else if (source.metadata.score > 100) score += 20
        else if (source.metadata.score > 50) score += 15
        else score += 10
      }
    }

    // Comments indicate discussion quality (max 15 points)
    if (source.metadata.comments) {
      if (source.metadata.comments > 100) score += 15
      else if (source.metadata.comments > 50) score += 12
      else if (source.metadata.comments > 20) score += 9
      else if (source.metadata.comments > 5) score += 6
      else score += 3
    }

    // Has actual comments scraped (max 15 points)
    if (source.topComments && source.topComments.length > 0) {
      score += 15
    }

    // Content length (max 10 points)
    if (source.content) {
      const wordCount = source.content.split(/\s+/).length
      if (wordCount > 500) score += 10
      else if (wordCount > 200) score += 7
      else if (wordCount > 100) score += 5
      else score += 2
    }

    // Relevance via simple keyword matching (max 10 points)
    const titleRelevance = this.calculateRelevance(source.title, query)
    score += titleRelevance * 10

    return score
  }

  private calculateRelevance(text: string, query: string): number {
    const textLower = text.toLowerCase()
    const queryTerms = query.toLowerCase().split(/\s+/)
    
    let matches = 0
    queryTerms.forEach(term => {
      if (textLower.includes(term)) matches++
    })

    return matches / queryTerms.length
  }
}
```

---

## Deep Analysis Engine {#analysis-engine}

### Multi-Pass Analysis System

**File:** `lib/research/deep-analyzer.ts`

```typescript
import { geminiClient } from '../gemini-client'
import { ScrapedSource } from '../scrapers'

export interface PainPoint {
  pain: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  frequency: number
  willingnessToPay: string
  currentSolutions: string[]
  quotes: string[]
  sources: string[]
}

export interface Opportunity {
  title: string
  description: string
  targetMarket: {
    demographics: string
    psychographics: string
    size: string
  }
  validationEvidence: string[]
  entryStrategy: string[]
  revenueEstimate: string
  competition: {
    existing: string[]
    gaps: string[]
  }
  risks: string[]
  validationScore: number
}

export interface MarketInsight {
  type: 'trend' | 'pattern' | 'shift' | 'gap'
  insight: string
  evidence: string[]
  impact: 'high' | 'medium' | 'low'
  timeframe: string
}

export class DeepAnalyzer {
  async analyze(sources: ScrapedSource[], prompt: string) {
    console.log('🧠 Starting deep analysis...')

    const [
      painPoints,
      opportunities,
      marketInsights,
      competitorIntel
    ] = await Promise.all([
      this.extractPainPoints(sources),
      this.identifyOpportunities(sources, prompt),
      this.extractMarketInsights(sources),
      this.analyzeCompetitors(sources)
    ])

    return {
      painPoints,
      opportunities,
      marketInsights,
      competitorIntel,
      summary: await this.synthesize({
        painPoints,
        opportunities,
        marketInsights,
        competitorIntel
      })
    }
  }

  private async extractPainPoints(sources: ScrapedSource[]): Promise<PainPoint[]> {
    // Focus on Reddit/HN comments - gold mine for pain points
    const discussionSources = sources.filter(s => 
      s.sourceType === 'reddit' || s.sourceType === 'hn'
    )

    const commentsText = discussionSources
      .flatMap(s => s.topComments || [])
      .map(c => `[${c.score} upvotes] ${c.text}`)
      .join('\n\n---\n\n')

    const postsText = discussionSources
      .map(s => `Title: ${s.title}\nContent: ${s.content}`)
      .join('\n\n---\n\n')

    const prompt = `You are analyzing customer discussions to extract pain points.

REDDIT/HN POSTS:
${postsText}

TOP COMMENTS:
${commentsText}

Extract SPECIFIC, ACTIONABLE pain points. Focus on:
1. Problems people are actively trying to solve RIGHT NOW
2. Frustrations with existing solutions
3. Unmet needs they've explicitly stated
4. Evidence of willingness to pay
5. Workarounds they've built (indicates strong need)

Return a JSON array of pain points:
[
  {
    "pain": "specific problem statement in user's words",
    "severity": "critical|high|medium|low",
    "frequency": <number of times mentioned>,
    "willingnessToPay": "evidence they'd pay for solution (quote or inference)",
    "currentSolutions": ["what they use now", "why it's inadequate"],
    "quotes": ["exact user quote 1", "exact user quote 2"],
    "sources": ["reddit post title or comment excerpt"]
  }
]

CRITICAL RULES:
- Only include pain points with clear evidence (quotes)
- Severity "critical" means users are desperate, "high" means actively seeking solutions
- Include willingness to pay indicators (mentions of budget, already paying for alternatives, etc.)
- Be specific - "email is hard" is too vague, "email clients can't handle 1000+ daily emails from support tickets" is specific

Return ONLY valid JSON, no other text.`

    try {
      const response = await geminiClient.generate(prompt)
      const jsonMatch = response.match(/\[[\s\S]*\]/)?.[0]
      
      if (jsonMatch) {
        const painPoints = JSON.parse(jsonMatch)
        console.log(`💊 Extracted ${painPoints.length} pain points`)
        return painPoints
      }
    } catch (error) {
      console.error('Failed to extract pain points:', error)
    }

    return []
  }

  private async identifyOpportunities(
    sources: ScrapedSource[],
    originalPrompt: string
  ): Promise<Opportunity[]> {
    const consolidatedContent = this.consolidateSources(sources)

    const prompt = `You are a business strategist analyzing market research.

ORIGINAL RESEARCH QUESTION:
${originalPrompt}

RESEARCH DATA:
${consolidatedContent}

Identify SPECIFIC, ACTIONABLE business opportunities.

Each opportunity must have:
1. Clear target market with demographics AND psychographics
2. Validated demand - cite specific evidence from sources
3. Concrete entry strategy - actual first steps to take
4. Realistic revenue potential with reasoning
5. Honest competition assessment
6. Risk factors

Return JSON array:
[
  {
    "title": "concise opportunity name",
    "description": "2-3 sentence description",
    "targetMarket": {
      "demographics": "age, location, income, etc.",
      "psychographics": "values, behaviors, pain points",
      "size": "estimated market size with source"
    },
    "validationEvidence": [
      "specific evidence from research with source citation",
      "e.g., '143 Reddit users in r/sales mentioned needing this in past month'"
    ],
    "entryStrategy": [
      "specific step 1",
      "specific step 2",
      "specific step 3"
    ],
    "revenueEstimate": "realistic estimate with reasoning",
    "competition": {
      "existing": ["competitor 1", "competitor 2"],
      "gaps": ["what they don't do well", "what's missing"]
    },
    "risks": ["risk 1", "risk 2"],
    "validationScore": <0-10, based on strength of evidence>
  }
]

REQUIREMENTS:
- Only include opportunities with validationScore > 6
- Evidence must be specific and traceable to sources
- Entry strategy must be actionable, not generic advice
- Revenue estimates must be grounded in research data

Return ONLY valid JSON.`

    try {
      const response = await geminiClient.generate(prompt)
      const jsonMatch = response.match(/\[[\s\S]*\]/)?.[0]
      
      if (jsonMatch) {
        const opportunities = JSON.parse(jsonMatch)
        console.log(`💡 Identified ${opportunities.length} opportunities`)
        
        // Filter by validation score
        return opportunities.filter((o: Opportunity) => o.validationScore > 6)
      }
    } catch (error) {
      console.error('Failed to identify opportunities:', error)
    }

    return []
  }

  private async extractMarketInsights(sources: ScrapedSource[]): Promise<MarketInsight[]> {
    const consolidatedContent = this.consolidateSources(sources)

    const prompt = `Analyze this market research and extract key insights.

RESEARCH DATA:
${consolidatedContent}

Identify:
- Emerging trends
- Market patterns
- Behavioral shifts
- Market gaps

Return JSON array of insights:
[
  {
    "type": "trend|pattern|shift|gap",
    "insight": "specific, actionable insight",
    "evidence": ["evidence 1", "evidence 2"],
    "impact": "high|medium|low",
    "timeframe": "how long until this matters"
  }
]

Focus on insights that are:
1. Backed by multiple sources
2. Actionable (you can make decisions based on them)
3. Non-obvious (not just restating what everyone knows)

Return ONLY valid JSON.`

    try {
      const response = await geminiClient.generate(prompt)
      const jsonMatch = response.match(/\[[\s\S]*\]/)?.[0]
      
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch)
        console.log(`🔍 Extracted ${insights.length} market insights`)
        return insights
      }
    } catch (error) {
      console.error('Failed to extract insights:', error)
    }

    return []
  }

  private async analyzeCompetitors(sources: ScrapedSource[]) {
    // Extract competitor mentions from sources
    const consolidatedContent = this.consolidateSources(sources)

    const prompt = `Analyze competitor mentions in this research.

RESEARCH DATA:
${consolidatedContent}

Extract:
1. Competitors mentioned
2. What users say about them (pros/cons)
3. Pricing mentioned
4. Feature gaps users complain about

Return JSON:
{
  "competitors": [
    {
      "name": "competitor name",
      "mentions": <number>,
      "sentiment": "positive|negative|mixed",
      "strengths": ["strength 1"],
      "weaknesses": ["weakness 1"],
      "pricing": "pricing info if mentioned",
      "userQuotes": ["relevant quote 1"]
    }
  ]
}

Return ONLY valid JSON.`

    try {
      const response = await geminiClient.generate(prompt)
      const jsonMatch = response.match(/\{[\s\S]*\}/)?.[0]
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch)
        console.log(`🏢 Analyzed ${analysis.competitors?.length || 0} competitors`)
        return analysis
      }
    } catch (error) {
      console.error('Failed to analyze competitors:', error)
    }

    return { competitors: [] }
  }

  private async synthesize(analyses: any) {
    const prompt = `Synthesize these research findings into a concise executive summary.

PAIN POINTS FOUND: ${analyses.painPoints.length}
OPPORTUNITIES IDENTIFIED: ${analyses.opportunities.length}
MARKET INSIGHTS: ${analyses.marketInsights.length}

DATA:
${JSON.stringify(analyses, null, 2)}

Create a 3-4 paragraph executive summary that:
1. Highlights the most critical findings
2. Connects pain points to opportunities
3. Provides clear recommendations
4. Notes confidence level and gaps in research

Be direct and actionable. Avoid fluff.`

    try {
      const summary = await geminiClient.generate(prompt)
      return summary
    } catch (error) {
      console.error('Failed to synthesize:', error)
      return 'Summary generation failed.'
    }
  }

  private consolidateSources(sources: ScrapedSource[]): string {
    return sources
      .slice(0, 15) // Limit to avoid token limits
      .map(s => {
        let text = `SOURCE: ${s.title}\nURL: ${s.url}\nTYPE: ${s.sourceType}\n`
        
        if (s.content) {
          text += `CONTENT: ${s.content.slice(0, 1000)}\n`
        }
        
        if (s.topComments && s.topComments.length > 0) {
          text += `TOP COMMENTS:\n`
          s.topComments.slice(0, 5).forEach(c => {
            text += `- [${c.score} pts] ${c.text.slice(0, 200)}\n`
          })
        }
        
        return text
      })
      .join('\n\n---\n\n')
      .slice(0, 30000) // Hard limit for context window
  }
}
```

---

## Validation Framework {#validation-framework}

**File:** `lib/research/validator.ts`

```typescript
import { geminiClient } from '../gemini-client'
import { PainPoint, Opportunity } from './deep-analyzer'

export class InsightValidator {
  async validatePainPoints(painPoints: PainPoint[]): Promise<PainPoint[]> {
    console.log('✅ Validating pain points...')

    return await Promise.all(
      painPoints.map(async (point) => {
        // Check evidence strength
        const hasStrongEvidence = 
          point.quotes.length >= 2 &&
          point.sources.length >= 2

        if (!hasStrongEvidence) {
          point.severity = 'low'
        }

        // Check actionability
        const actionabilityScore = await this.scoreActionability(point.pain)
        
        return {
          ...point,
          validated: hasStrongEvidence,
          actionabilityScore
        }
      })
    )
  }

  async validateOpportunities(opportunities: Opportunity[]): Promise<Opportunity[]> {
    console.log('✅ Validating opportunities...')

    return await Promise.all(
      opportunities.map(async (opp) => {
        // Recalculate validation score based on evidence
        const evidenceScore = opp.validationEvidence.length * 2
        const entryScore = opp.entryStrategy.length >= 3 ? 3 : 1
        const competitionScore = opp.competition.gaps.length > 0 ? 2 : 0
        
        const recalculatedScore = Math.min(10, evidenceScore + entryScore + competitionScore)

        // Check for red flags
        const redFlags = []
        
        if (opp.competition.existing.length === 0) {
          redFlags.push('No competition mentioned - may indicate no market')
        }
        
        if (opp.validationEvidence.length < 3) {
          redFlags.push('Limited evidence - needs more validation')
        }
        
        if (!opp.revenueEstimate.match(/\d/)) {
          redFlags.push('No numeric revenue estimate provided')
        }

        return {
          ...opp,
          validationScore: recalculatedScore,
          redFlags,
          validated: recalculatedScore >= 7 && redFlags.length === 0
        }
      })
    )
  }

  private async scoreActionability(text: string): Promise<number> {
    const prompt = `Rate the actionability of this insight on a scale of 0-10.

INSIGHT: "${text}"

An actionable insight should have:
- Specific target audience (not "users" but "B2B SaaS founders with 10-50 employees")
- Clear problem statement
- Implied or explicit solution direction
- Measurable outcome potential

Score (0-10):`

    try {
      const response = await geminiClient.generate(prompt)
      const score = parseInt(response.match(/\d+/)?.[0] || '5')
      return Math.min(10, Math.max(0, score))
    } catch {
      return 5 // Default mid-range
    }
  }

  async enrichLowQualityInsights(insights: any[]): Promise<any[]> {
    console.log('🔧 Enriching low-quality insights...')

    return await Promise.all(
      insights.map(async (insight) => {
        if (insight.actionabilityScore < 6) {
          const enriched = await this.makeMoreActionable(insight)
          return { ...insight, enriched }
        }
        return insight
      })
    )
  }

  private async makeMoreActionable(insight: any): Promise<string> {
    const prompt = `Make this insight more actionable by adding specificity:

ORIGINAL: "${insight.pain || insight.insight}"

Transform it by adding:
1. WHO specifically this affects (demographics, role, company size)
2. WHAT specific action to take
3. HOW to measure success
4. WHEN to do it (timeframe)

Return the improved, actionable version:`

    try {
      const enriched = await geminiClient.generate(prompt)
      return enriched.trim()
    } catch {
      return insight.pain || insight.insight
    }
  }
}
```

---

## Database Schema Updates {#schema-updates}

**File:** `prisma/schema.prisma` (additions)

```prisma
model ResearchSource {
  id              String    @id @default(cuid())
  researchId      String
  research        Research  @relation(fields: [researchId], references: [id], onDelete: Cascade)
  
  url             String
  title           String
  excerpt         String?   @db.Text
  
  // Enhanced fields
  sourceType      String    // 'reddit' | 'hn' | 'academic' | 'news' | 'web'
  score           Float     @default(0) // Relevance/quality score
  sentiment       String?   // 'positive' | 'negative' | 'neutral'
  
  // Engagement metrics
  engagement      Json?     // { upvotes, comments, shares, etc. }
  
  // For Reddit/HN posts
  topComments     Json?     // Array of top comments
  
  // Metadata
  metadata        Json?     // Flexible storage for source-specific data
  
  createdAt       DateTime  @default(now())
  
  @@index([researchId])
  @@index([sourceType])
  @@index([score])
}

model ResearchInsight {
  id              String    @id @default(cuid())
  researchId      String
  research        Research  @relation(fields: [researchId], references: [id], onDelete: Cascade)
  
  title           String
  description     String    @db.Text
  category        String    // Original: impact level
  
  // Enhanced fields
  insightType     String    // 'pain_point' | 'opportunity' | 'competitor' | 'trend' | 'risk'
  confidence      String    // 'high' | 'medium' | 'low'
  
  // Structured evidence
  evidence        Json      // { quotes: [], sources: [], statistics: [] }
  
  // Validation
  validation      Json?     // { evidenceScore: number, actionabilityScore: number, redFlags: [] }
  actionability   Float     @default(0) // 0-10 score
  
  // For pain points
  severity        String?   // 'critical' | 'high' | 'medium' | 'low'
  frequency       Int?      // How many times mentioned
  
  // For opportunities
  targetMarket    Json?     // { demographics, psychographics, size }
  entryStrategy   Json?     // Array of steps
  revenueEstimate String?
  
  createdAt       DateTime  @default(now())
  
  @@index([researchId])
  @@index([insightType])
  @@index([confidence])
  @@index([actionability])
}

model ActionItem {
  id              String    @id @default(cuid())
  researchId      String
  research        Research  @relation(fields: [researchId], references: [id], onDelete: Cascade)
  
  title           String
  description     String    @db.Text
  priority        String    // 'high' | 'medium' | 'low'
  
  // Enhanced fields
  category        String?   // 'immediate' | 'short-term' | 'long-term'
  
  // Validation
  validated       Boolean   @default(false)
  validationNotes String?   @db.Text
  
  // Conversion tracking
  convertedToTaskId String? @unique
  
  completed       Boolean   @default(false)
  createdAt       DateTime  @default(now())
  
  @@index([researchId])
  @@index([priority])
  @@index([completed])
}

// New model for competitor intelligence
model CompetitorIntel {
  id              String    @id @default(cuid())
  researchId      String
  research        Research  @relation(fields: [researchId], references: [id], onDelete: Cascade)
  
  name            String
  mentions        Int       @default(0)
  sentiment       String    // 'positive' | 'negative' | 'mixed'
  
  strengths       Json      // Array of strengths
  weaknesses      Json      // Array of weaknesses
  
  pricing         String?
  userQuotes      Json      // Array of quotes
  
  metadata        Json?
  
  createdAt       DateTime  @default(now())
  
  @@index([researchId])
  @@index([name])
}
```

---

## Updated Inngest Agent Job {#inngest-update}

**File:** `inngest/research-agent.ts`

```typescript
import { inngest } from './client'
import { prisma } from '@/lib/prisma'
import { SourceDiscovery } from '@/lib/research/source-discovery'
import { DeepAnalyzer } from '@/lib/research/deep-analyzer'
import { InsightValidator } from '@/lib/research/validator'
import { scrapers } from '@/lib/scrapers'

export const researchAgent = inngest.createFunction(
  {
    id: 'research-agent',
    name: 'Deep Research Agent',
    concurrency: {
      limit: parseInt(process.env.MAX_CONCURRENT_RESEARCH || '3')
    }
  },
  { event: 'research/start' },
  async ({ event, step }) => {
    const { researchId, userId } = event.data

    try {
      // Update status
      await step.run('update-status-discovering', async () => {
        await prisma.research.update({
          where: { id: researchId },
          data: {
            status: 'discovering',
            progress: 10
          }
        })
      })

      // Step 1: Source Discovery
      const sources = await step.run('discover-sources', async () => {
        const research = await prisma.research.findUnique({
          where: { id: researchId }
        })

        if (!research) throw new Error('Research not found')

        const discovery = new SourceDiscovery()
        const discovered = await discovery.discover({
          prompt: research.refinedPrompt || research.prompt,
          industry: research.industry,
          targetAudience: research.targetAudience
        })

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: 30 }
        })

        return discovered.all
      })

      // Step 2: Scrape Full Content
      await step.run('scrape-content', async () => {
        // For sources without content, scrape them
        const sourcesToScrape = sources.filter(s => 
          !s.content && s.sourceType === 'web'
        )

        const scrapedContent = await Promise.allSettled(
          sourcesToScrape.map(async (source) => {
            try {
              const scraped = await scrapers.generic.scrape(source.url)
              return {
                ...source,
                content: scraped.content
              }
            } catch {
              return source
            }
          })
        )

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: 50 }
        })

        return scrapedContent
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value)
      })

      // Step 3: Store Sources
      await step.run('store-sources', async () => {
        await prisma.researchSource.createMany({
          data: sources.map(source => ({
            researchId,
            url: source.url,
            title: source.title,
            excerpt: source.content?.slice(0, 1000),
            sourceType: source.sourceType,
            score: source.score || 0,
            sentiment: null,
            engagement: source.metadata.engagement || null,
            topComments: source.topComments || null,
            metadata: source.metadata
          }))
        })

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: 60 }
        })
      })

      // Step 4: Deep Analysis
      const analysis = await step.run('deep-analysis', async () => {
        await prisma.research.update({
          where: { id: researchId },
          data: { status: 'analyzing' }
        })

        const research = await prisma.research.findUnique({
          where: { id: researchId }
        })

        const analyzer = new DeepAnalyzer()
        const results = await analyzer.analyze(
          sources,
          research?.refinedPrompt || research?.prompt || ''
        )

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: 80 }
        })

        return results
      })

      // Step 5: Validate Insights
      const validated = await step.run('validate-insights', async () => {
        const validator = new InsightValidator()
        
        const validatedPainPoints = await validator.validatePainPoints(
          analysis.painPoints
        )
        
        const validatedOpportunities = await validator.validateOpportunities(
          analysis.opportunities
        )

        return {
          painPoints: validatedPainPoints,
          opportunities: validatedOpportunities,
          insights: analysis.marketInsights,
          competitors: analysis.competitorIntel
        }
      })

      // Step 6: Store Results
      await step.run('store-results', async () => {
        // Store pain points as insights
        await prisma.researchInsight.createMany({
          data: validated.painPoints.map(point => ({
            researchId,
            title: point.pain,
            description: point.willingnessToPay,
            category: point.severity,
            insightType: 'pain_point',
            confidence: point.validated ? 'high' : 'medium',
            evidence: {
              quotes: point.quotes,
              sources: point.sources,
              currentSolutions: point.currentSolutions
            },
            validation: {
              evidenceScore: point.quotes.length,
              actionabilityScore: point.actionabilityScore || 0
            },
            actionability: point.actionabilityScore || 0,
            severity: point.severity,
            frequency: point.frequency
          }))
        })

        // Store opportunities as insights
        await prisma.researchInsight.createMany({
          data: validated.opportunities.map(opp => ({
            researchId,
            title: opp.title,
            description: opp.description,
            category: 'high', // Based on validation score
            insightType: 'opportunity',
            confidence: opp.validated ? 'high' : 'medium',
            evidence: {
              validationEvidence: opp.validationEvidence,
              competition: opp.competition
            },
            validation: {
              validationScore: opp.validationScore,
              redFlags: opp.redFlags || []
            },
            actionability: opp.validationScore,
            targetMarket: opp.targetMarket,
            entryStrategy: opp.entryStrategy,
            revenueEstimate: opp.revenueEstimate
          }))
        })

        // Store market insights
        await prisma.researchInsight.createMany({
          data: validated.insights.map(insight => ({
            researchId,
            title: insight.insight,
            description: insight.evidence.join(' | '),
            category: insight.impact,
            insightType: insight.type,
            confidence: insight.evidence.length >= 3 ? 'high' : 'medium',
            evidence: { sources: insight.evidence },
            actionability: insight.impact === 'high' ? 8 : insight.impact === 'medium' ? 5 : 3
          }))
        })

        // Store competitor intel
        if (validated.competitors.competitors?.length > 0) {
          await prisma.competitorIntel.createMany({
            data: validated.competitors.competitors.map(comp => ({
              researchId,
              name: comp.name,
              mentions: comp.mentions,
              sentiment: comp.sentiment,
              strengths: comp.strengths,
              weaknesses: comp.weaknesses,
              pricing: comp.pricing,
              userQuotes: comp.userQuotes
            }))
          })
        }

        // Generate action items from opportunities
        const actionItems = validated.opportunities
          .filter(opp => opp.validated)
          .flatMap(opp => 
            opp.entryStrategy.slice(0, 3).map((step, idx) => ({
              researchId,
              title: step,
              description: `From opportunity: ${opp.title}`,
              priority: idx === 0 ? 'high' : 'medium',
              category: 'immediate',
              validated: true
            }))
          )

        if (actionItems.length > 0) {
          await prisma.actionItem.createMany({ data: actionItems })
        }

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: 90 }
        })
      })

      // Step 7: Generate Summary
      await step.run('finalize', async () => {
        await prisma.research.update({
          where: { id: researchId },
          data: {
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            summary: analysis.summary
          }
        })
      })

      // Cleanup
      await step.run('cleanup', async () => {
        await scrapers.reddit.close()
      })

      return { success: true, researchId }

    } catch (error) {
      console.error('Research agent error:', error)

      await prisma.research.update({
        where: { id: researchId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }
)
```

---

## Implementation Roadmap {#implementation-roadmap}

### Phase 1: Foundation (Week 1)
- [ ] Install dependencies: `puppeteer`, `@mozilla/readability`, `jsdom`
- [ ] Implement `RedditScraper` class
- [ ] Test Reddit scraping with multiple subreddits
- [ ] Add comment extraction
- [ ] Create scraper registry

### Phase 2: Multi-Source Integration (Week 2)
- [ ] Implement `HackerNewsScraper`
- [ ] Implement `GenericScraper` with Readability
- [ ] Create `SourceDiscovery` class
- [ ] Implement dynamic subreddit discovery
- [ ] Add source ranking algorithm

### Phase 3: Deep Analysis (Week 3)
- [ ] Build `DeepAnalyzer` class
- [ ] Implement pain point extraction
- [ ] Implement opportunity identification
- [ ] Add market insight extraction
- [ ] Add competitor analysis

### Phase 4: Validation & Quality (Week 4)
- [ ] Create `InsightValidator` class
- [ ] Implement evidence validation
- [ ] Add actionability scoring
- [ ] Create insight enrichment system

### Phase 5: Integration (Week 5)
- [ ] Update Prisma schema
- [ ] Run migrations
- [ ] Update Inngest agent job
- [ ] Update frontend to display new fields
- [ ] Add competitor intel UI tab

### Phase 6: Testing & Optimization
- [ ] Test with various research topics
- [ ] Optimize scraping performance
- [ ] Add rate limiting for scrapers
- [ ] Add error handling and retries
- [ ] Create monitoring/logging

---

## Environment Variables

Add to `.env`:

```bash
# Scraping
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser  # For production
MAX_SOURCES_PER_TYPE=10
SCRAPING_TIMEOUT_MS=30000

# Analysis
GEMINI_API_KEY=your_key_here
MAX_ANALYSIS_TOKENS=100000

# Reddit Specific
REDDIT_MIN_SCORE=10
REDDIT_MAX_POSTS=30
REDDIT_MAX_COMMENTS=15
```

---

## Key Success Metrics

Track these to measure improvement:

1. **Source Diversity**: % of sources from Reddit/HN vs generic web
2. **Evidence Strength**: Avg number of quotes per pain point
3. **Actionability Score**: Avg score across all insights
4. **Validation Rate**: % of insights that pass validation
5. **User Satisfaction**: Do users act on the insights?

---

## Pro Tips

### Reddit Scraping Best Practices
1. **Target niche subreddits** - r/entrepreneur has better signal than r/business
2. **Sort by "top" for past month** - balances recency with quality
3. **Focus on comments** - Top comments often contain the real insights
4. **Look for buying signals** - "just bought", "worth it?", "budget"

### Analysis Best Practices
1. **Multiple passes** - Don't try to extract everything in one prompt
2. **Structured outputs** - Use JSON schemas for consistent data
3. **Evidence-based** - Every insight must cite sources
4. **Validate vigorously** - Better to have 5 great insights than 20 mediocre ones

### Performance Optimization
1. **Parallel scraping** - Use Promise.all for concurrent requests
2. **Cache results** - Don't re-scrape the same URL
3. **Rate limiting** - Add delays to avoid being blocked
4. **Headless mode** - Always use headless: true in production

---

## Troubleshooting

### Reddit Scraping Issues

**Problem**: Getting blocked by Reddit
**Solution**: Rotate user agents, add random delays, use residential proxies

**Problem**: Can't find posts
**Solution**: Reddit's DOM changes frequently - inspect and update selectors

**Problem**: Comments not loading
**Solution**: Increase wait times, scroll to load lazy content

### Analysis Quality Issues

**Problem**: Generic, non-actionable insights
**Solution**: Be more specific in prompts, require evidence, validate outputs

**Problem**: Hallucinated data
**Solution**: Cross-reference with sources, require exact quotes

---

## Next Steps

After implementing this system, consider:

1. **Add more sources**: Twitter/X, LinkedIn, Product Hunt, G2/Capterra reviews
2. **Implement RAG**: Use vector embeddings for semantic search across sources
3. **Add automation**: Auto-trigger research on schedule or events
4. **Build templates**: Pre-configured research for common use cases
5. **Add collaboration**: Share research, comment on insights, collaborative validation

---

## Conclusion

This robust deep research agent transforms your current system from basic web scraping into a comprehensive intelligence platform. The key differentiators are:

1. **Reddit as primary source** - Where real pain points live
2. **Multi-pass analysis** - Specialized prompts for each insight type  
3. **Validation loop** - Ensures quality over quantity
4. **Evidence-based** - Every claim traced to sources

The result: **Actionable insights you can actually use to make business decisions.**
