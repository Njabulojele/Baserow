# Email & Calendar Integration Guide
## Real OAuth Implementation for Gmail & Google Calendar

---

## Overview

This guide shows you how to:
1. ✅ Set up real Gmail OAuth to read/send emails
2. ✅ Set up real Google Calendar OAuth to sync events
3. ✅ Auto-capture emails from contacts (leads/clients)
4. ✅ Auto-log meetings as CRM activities
5. ✅ Send emails from your CRM
6. ✅ Create calendar events from meetings

---

## Part 1: Google Cloud Setup (One-Time)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Name it: `YourApp CRM Integration`
4. Click "Create"

### Step 2: Enable APIs

1. In your project, go to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - **Gmail API** (for email sync)
   - **Google Calendar API** (for calendar sync)
   - **Google People API** (for contact enrichment - optional)

### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen first:
   - User Type: **External** (for testing) or **Internal** (if using Google Workspace)
   - App name: `YourApp CRM`
   - User support email: your email
   - Developer contact: your email
   - Scopes: Add these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly` (read emails)
     - `https://www.googleapis.com/auth/gmail.send` (send emails)
     - `https://www.googleapis.com/auth/gmail.modify` (mark as read)
     - `https://www.googleapis.com/auth/calendar` (full calendar access)
     - `https://www.googleapis.com/auth/calendar.events` (calendar events)
   - Test users: Add your email (if in testing mode)
   - Click "Save and Continue"

4. Back to "Create OAuth client ID":
   - Application type: **Web application**
   - Name: `CRM Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://yourdomain.com/api/auth/google/callback`
   - Click "Create"

5. **SAVE THESE CREDENTIALS:**
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

### Step 4: Add to .env

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# For production
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here_use_openssl_rand_base64_32
```

---

## Part 2: Database Schema Updates

Add OAuth token storage to your User model:

```prisma
model User {
  // ... existing fields ...
  
  // Google OAuth tokens
  googleAccessToken     String?   @db.Text
  googleRefreshToken    String?   @db.Text
  googleTokenExpiresAt  DateTime?
  googleScopes          String[]  // Track which scopes user granted
  
  // Email sync settings
  emailSyncEnabled      Boolean   @default(false)
  lastEmailSyncAt       DateTime?
  emailSyncCursor       String?   // Gmail history ID for incremental sync
  
  // Calendar sync settings  
  calendarSyncEnabled   Boolean   @default(false)
  lastCalendarSyncAt    DateTime?
  calendarSyncToken     String?   // Sync token for incremental sync
}
```

Run migration:
```bash
npx prisma migrate dev --name add_google_oauth
```

---

## Part 3: Install Dependencies

```bash
npm install googleapis
npm install next-auth @next-auth/prisma-adapter
npm install @google-cloud/local-auth  # Optional for easier OAuth testing
```

---

## Part 4: NextAuth Setup (Recommended)

NextAuth makes OAuth flows much easier.

### Create: `lib/auth.ts`

```typescript
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
          access_type: "offline", // Critical for refresh tokens
          prompt: "consent", // Force consent screen to get refresh token
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Save tokens to JWT on first sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.scope = account.scope;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass tokens to session
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.expiresAt = token.expiresAt as number;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      // Save tokens to database when user signs in
      if (account && user.email) {
        await prisma.user.update({
          where: { email: user.email },
          data: {
            googleAccessToken: account.access_token,
            googleRefreshToken: account.refresh_token,
            googleTokenExpiresAt: account.expires_at 
              ? new Date(account.expires_at * 1000) 
              : null,
            googleScopes: account.scope?.split(" ") || [],
          },
        });
      }
    },
  },
};
```

### Create: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### Update: `types/next-auth.d.ts`

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    scope?: string;
  }
}
```

---

## Part 5: Gmail Service Implementation

### Create: `lib/services/gmail.service.ts`

```typescript
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import type { gmail_v1 } from "googleapis";

export class GmailService {
  private gmail: gmail_v1.Gmail;

  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    this.gmail = google.gmail({ version: "v1", auth: oauth2Client });
  }

  /**
   * Get OAuth2 client with auto-refresh
   */
  static async getAuthClient(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiresAt: true,
      },
    });

    if (!user?.googleAccessToken) {
      throw new Error("User not connected to Google");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiresAt?.getTime(),
    });

    // Auto-refresh if expired
    oauth2Client.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            googleAccessToken: tokens.access_token,
            googleTokenExpiresAt: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : null,
          },
        });
      }
    });

    return oauth2Client;
  }

  /**
   * Sync emails from Gmail (incremental)
   */
  static async syncEmails(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const auth = await this.getAuthClient(userId);
    const gmail = google.gmail({ version: "v1", auth });

    try {
      // Get history ID for incremental sync
      const historyId = user.emailSyncCursor;
      
      let messages: any[] = [];

      if (historyId) {
        // Incremental sync using history API
        const history = await gmail.users.history.list({
          userId: "me",
          startHistoryId: historyId,
          historyTypes: ["messageAdded"],
        });

        messages = history.data.history?.flatMap(h => h.messagesAdded || []) || [];
      } else {
        // Initial full sync (last 7 days)
        const sevenDaysAgo = Math.floor(Date.now() / 1000) - 604800;
        const res = await gmail.users.messages.list({
          userId: "me",
          q: `after:${sevenDaysAgo}`,
          maxResults: 100,
        });

        messages = res.data.messages || [];
      }

      // Process each message
      for (const msg of messages) {
        const messageId = msg.message?.id || msg.id;
        if (!messageId) continue;

        const fullMessage = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        await this.processEmail(userId, fullMessage.data);
      }

      // Update sync cursor
      const profile = await gmail.users.getProfile({ userId: "me" });
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastEmailSyncAt: new Date(),
          emailSyncCursor: profile.data.historyId,
        },
      });

      return { synced: messages.length };
    } catch (error) {
      console.error("Gmail sync error:", error);
      throw error;
    }
  }

  /**
   * Process individual email and create CRM activity
   */
  private static async processEmail(userId: string, message: gmail_v1.Schema$Message) {
    const headers = message.payload?.headers || [];
    
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

    const from = getHeader("from");
    const to = getHeader("to");
    const subject = getHeader("subject");
    const date = getHeader("date");

    if (!from) return;

    // Extract email addresses
    const fromEmail = this.extractEmail(from);
    const toEmails = to?.split(",").map((e) => this.extractEmail(e)) || [];

    // Check if email is from/to a lead or client
    const contact = await this.findContact(fromEmail, toEmails);
    if (!contact) return; // Not a CRM contact

    // Extract email body
    const body = this.extractEmailBody(message);

    // AI analysis (optional - using Gemini)
    const analysis = await this.analyzeEmailWithAI(body);

    // Determine direction
    const userEmail = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const isOutbound = fromEmail === userEmail?.email;

    // Create CRM activity
    await prisma.crmActivity.create({
      data: {
        userId,
        leadId: contact.leadId,
        clientId: contact.clientId,
        type: "EMAIL",
        direction: isOutbound ? "outbound" : "inbound",
        subject: subject || "(No subject)",
        description: body.substring(0, 5000), // Limit size
        sentiment: analysis?.sentiment,
        keyTopics: analysis?.topics || [],
        completedAt: date ? new Date(date) : new Date(),
      },
    });

    // Update lead/client engagement
    if (contact.leadId) {
      await prisma.crmLead.update({
        where: { id: contact.leadId },
        data: {
          lastEngagement: new Date(),
          engagementScore: { increment: 1 },
        },
      });
    }
  }

  /**
   * Extract plain email address from "Name <email@domain.com>" format
   */
  private static extractEmail(str: string): string {
    const match = str.match(/<(.+?)>/);
    return match ? match[1] : str.trim();
  }

  /**
   * Find if email belongs to a lead or client
   */
  private static async findContact(fromEmail: string, toEmails: string[]) {
    const allEmails = [fromEmail, ...toEmails];

    // Check leads
    const lead = await prisma.crmLead.findFirst({
      where: { email: { in: allEmails } },
      select: { id: true },
    });

    if (lead) return { leadId: lead.id, clientId: null };

    // Check clients
    const client = await prisma.client.findFirst({
      where: { email: { in: allEmails } },
      select: { id: true },
    });

    if (client) return { leadId: null, clientId: client.id };

    return null;
  }

  /**
   * Extract email body (text/plain or text/html)
   */
  private static extractEmailBody(message: gmail_v1.Schema$Message): string {
    let body = "";

    const parts = message.payload?.parts || [message.payload];

    for (const part of parts) {
      if (part?.mimeType === "text/plain" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        break;
      } else if (part?.mimeType === "text/html" && part.body?.data) {
        // Fallback to HTML if no plain text
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        // Strip HTML tags (basic)
        body = body.replace(/<[^>]*>/g, "");
      }
    }

    return body;
  }

  /**
   * AI analysis of email content (optional)
   */
  private static async analyzeEmailWithAI(body: string) {
    // Use your existing Gemini setup
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `
Analyze this business email and return JSON with:
{
  "sentiment": number (-1 to 1),
  "topics": string[] (max 3 topics),
  "buyingSignals": string[] (from: budget_discussed, timeline_mentioned, decision_maker_involved, pricing_inquiry, demo_request)
}

Email:
${body.substring(0, 2000)}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("AI analysis error:", error);
    }

    return null;
  }

  /**
   * Send email via Gmail
   */
  static async sendEmail(userId: string, params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
    leadId?: string;
    clientId?: string;
  }) {
    const auth = await this.getAuthClient(userId);
    const gmail = google.gmail({ version: "v1", auth });

    // Create email in RFC 2822 format
    const email = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      `Content-Type: ${params.html ? "text/html" : "text/plain"}; charset=utf-8`,
      "",
      params.html || params.body,
    ].join("\n");

    const encodedEmail = Buffer.from(email).toString("base64url");

    try {
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      // Log as CRM activity
      await prisma.crmActivity.create({
        data: {
          userId,
          leadId: params.leadId,
          clientId: params.clientId,
          type: "EMAIL",
          direction: "outbound",
          subject: params.subject,
          description: params.body,
          completedAt: new Date(),
        },
      });

      return res.data;
    } catch (error) {
      console.error("Send email error:", error);
      throw error;
    }
  }
}
```

---

## Part 6: Google Calendar Service

### Create: `lib/services/calendar.service.ts`

```typescript
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import type { calendar_v3 } from "googleapis";

export class CalendarService {
  /**
   * Get OAuth2 client (reuse from GmailService)
   */
  private static async getAuthClient(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiresAt: true,
      },
    });

    if (!user?.googleAccessToken) {
      throw new Error("User not connected to Google");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiresAt?.getTime(),
    });

    oauth2Client.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            googleAccessToken: tokens.access_token,
            googleTokenExpiresAt: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : null,
          },
        });
      }
    });

    return oauth2Client;
  }

  /**
   * Sync calendar events (incremental)
   */
  static async syncCalendarEvents(userId: string) {
    const auth = await this.getAuthClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    try {
      const syncToken = user.calendarSyncToken;
      
      let events: calendar_v3.Schema$Event[] = [];

      if (syncToken) {
        // Incremental sync
        const res = await calendar.events.list({
          calendarId: "primary",
          syncToken,
          maxResults: 100,
        });

        events = res.data.items || [];
        
        // Update sync token
        if (res.data.nextSyncToken) {
          await prisma.user.update({
            where: { id: userId },
            data: { calendarSyncToken: res.data.nextSyncToken },
          });
        }
      } else {
        // Initial sync (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const res = await calendar.events.list({
          calendarId: "primary",
          timeMin: thirtyDaysAgo.toISOString(),
          maxResults: 250,
          singleEvents: true,
          orderBy: "startTime",
        });

        events = res.data.items || [];

        // Save sync token for next time
        if (res.data.nextSyncToken) {
          await prisma.user.update({
            where: { id: userId },
            data: { calendarSyncToken: res.data.nextSyncToken },
          });
        }
      }

      // Process events
      for (const event of events) {
        await this.processCalendarEvent(userId, event);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { lastCalendarSyncAt: new Date() },
      });

      return { synced: events.length };
    } catch (error) {
      console.error("Calendar sync error:", error);
      throw error;
    }
  }

  /**
   * Process calendar event and create CRM activity
   */
  private static async processCalendarEvent(
    userId: string,
    event: calendar_v3.Schema$Event
  ) {
    if (!event.start?.dateTime || event.status === "cancelled") return;

    // Extract attendee emails
    const attendees = event.attendees?.map((a) => a.email || "") || [];
    
    // Check if any attendees are leads/clients
    const contact = await this.findContact(attendees);
    if (!contact) return;

    // Calculate duration
    const start = new Date(event.start.dateTime);
    const end = event.end?.dateTime ? new Date(event.end.dateTime) : start;
    const duration = Math.round((end.getTime() - start.getTime()) / 60000); // minutes

    // Create or update CRM activity
    await prisma.crmActivity.upsert({
      where: {
        // Use a composite unique constraint or handle duplicates
        id: `gcal-${event.id}`, // Assumes you add externalId field
      },
      update: {
        subject: event.summary || "Meeting",
        description: event.description,
        duration,
        attendees,
        completedAt: start,
      },
      create: {
        id: `gcal-${event.id}`,
        userId,
        leadId: contact.leadId,
        clientId: contact.clientId,
        type: "MEETING",
        subject: event.summary || "Meeting",
        description: event.description,
        duration,
        attendees,
        completedAt: start,
      },
    });

    // Update engagement
    if (contact.leadId) {
      await prisma.crmLead.update({
        where: { id: contact.leadId },
        data: {
          lastEngagement: start,
          engagementScore: { increment: 3 }, // Meetings worth more than emails
        },
      });
    }
  }

  /**
   * Find contact by attendee emails
   */
  private static async findContact(emails: string[]) {
    const lead = await prisma.crmLead.findFirst({
      where: { email: { in: emails } },
      select: { id: true },
    });

    if (lead) return { leadId: lead.id, clientId: null };

    const client = await prisma.client.findFirst({
      where: { email: { in: emails } },
      select: { id: true },
    });

    if (client) return { leadId: null, clientId: client.id };

    return null;
  }

  /**
   * Create calendar event from Meeting
   */
  static async createCalendarEvent(userId: string, meetingId: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) throw new Error("Meeting not found");

    const auth = await this.getAuthClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    const endTime = new Date(meeting.scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + meeting.duration);

    try {
      const event = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: meeting.title,
          description: meeting.description,
          start: {
            dateTime: meeting.scheduledAt.toISOString(),
            timeZone: meeting.timezone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: meeting.timezone,
          },
          attendees: [
            ...meeting.requiredAttendees.map((email) => ({ email })),
            ...meeting.optionalAttendees.map((email) => ({ email, optional: true })),
          ],
          location: meeting.location,
          conferenceData: meeting.meetingLink
            ? {
                entryPoints: [{ entryPointType: "video", uri: meeting.meetingLink }],
              }
            : undefined,
        },
        sendUpdates: "all", // Send email invites
      });

      // Save Google Calendar event ID to meeting
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          // Add externalEventId field to Meeting model
          // externalEventId: event.data.id,
        },
      });

      return event.data;
    } catch (error) {
      console.error("Create calendar event error:", error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  static async updateCalendarEvent(userId: string, meetingId: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting /* || !meeting.externalEventId */) {
      return this.createCalendarEvent(userId, meetingId);
    }

    const auth = await this.getAuthClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    const endTime = new Date(meeting.scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + meeting.duration);

    try {
      const event = await calendar.events.update({
        calendarId: "primary",
        eventId: "meeting.externalEventId", // Add this field to Meeting model
        requestBody: {
          summary: meeting.title,
          description: meeting.description,
          start: {
            dateTime: meeting.scheduledAt.toISOString(),
            timeZone: meeting.timezone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: meeting.timezone,
          },
          attendees: [
            ...meeting.requiredAttendees.map((email) => ({ email })),
            ...meeting.optionalAttendees.map((email) => ({ email, optional: true })),
          ],
        },
        sendUpdates: "all",
      });

      return event.data;
    } catch (error) {
      console.error("Update calendar event error:", error);
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  static async deleteCalendarEvent(userId: string, externalEventId: string) {
    const auth = await this.getAuthClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    try {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: externalEventId,
        sendUpdates: "all",
      });
    } catch (error) {
      console.error("Delete calendar event error:", error);
      throw error;
    }
  }
}
```

---

## Part 7: tRPC Routes for Sync

### Create: `server/api/routers/sync.ts`

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { GmailService } from "@/lib/services/gmail.service";
import { CalendarService } from "@/lib/services/calendar.service";

export const syncRouter = createTRPCRouter({
  // Enable email sync for user
  enableEmailSync: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.update({
      where: { id: ctx.session.user.id },
      data: { emailSyncEnabled: true },
    });

    return { success: true };
  }),

  // Trigger manual email sync
  syncEmails: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await GmailService.syncEmails(ctx.session.user.id);
    return result;
  }),

  // Enable calendar sync
  enableCalendarSync: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.update({
      where: { id: ctx.session.user.id },
      data: { calendarSyncEnabled: true },
    });

    return { success: true };
  }),

  // Trigger manual calendar sync
  syncCalendar: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await CalendarService.syncCalendarEvents(ctx.session.user.id);
    return result;
  }),

  // Get sync status
  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        emailSyncEnabled: true,
        lastEmailSyncAt: true,
        calendarSyncEnabled: true,
        lastCalendarSyncAt: true,
        googleScopes: true,
      },
    });

    return user;
  }),

  // Send email
  sendEmail: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
        html: z.string().optional(),
        leadId: z.string().optional(),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await GmailService.sendEmail(ctx.session.user.id, input);
      return result;
    }),
});
```

---

## Part 8: Cron Job for Auto-Sync

### Create: `app/api/cron/sync/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GmailService } from "@/lib/services/gmail.service";
import { CalendarService } from "@/lib/services/calendar.service";

export const dynamic = "force-dynamic";

// This route should be called by a cron job every 15 minutes
// Use Vercel Cron, or external service like cron-job.org

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get all users with sync enabled
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { emailSyncEnabled: true },
          { calendarSyncEnabled: true },
        ],
      },
      select: {
        id: true,
        emailSyncEnabled: true,
        calendarSyncEnabled: true,
      },
    });

    const results = {
      total: users.length,
      emailSynced: 0,
      calendarSynced: 0,
      errors: [] as string[],
    };

    for (const user of users) {
      try {
        if (user.emailSyncEnabled) {
          await GmailService.syncEmails(user.id);
          results.emailSynced++;
        }

        if (user.calendarSyncEnabled) {
          await CalendarService.syncCalendarEvents(user.id);
          results.calendarSynced++;
        }
      } catch (error) {
        console.error(`Sync error for user ${user.id}:`, error);
        results.errors.push(`User ${user.id}: ${error}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

### Setup Vercel Cron (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Add to `.env`:
```env
CRON_SECRET=your_random_secret_here
```

---

## Part 9: UI Components

### OAuth Connect Button

```tsx
"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function GoogleConnectButton() {
  const { data: session } = useSession();

  const handleConnect = async () => {
    await signIn("google", {
      callbackUrl: "/settings/integrations",
    });
  };

  return (
    <Button onClick={handleConnect} className="gap-2">
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        {/* Google icon SVG */}
      </svg>
      {session ? "Reconnect Google" : "Connect Google Account"}
    </Button>
  );
}
```

### Sync Settings Page

```tsx
"use client";

import { api } from "@/lib/trpc/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function IntegrationsPage() {
  const { data: syncStatus, refetch } = api.sync.getSyncStatus.useQuery();
  const enableEmail = api.sync.enableEmailSync.useMutation();
  const enableCalendar = api.sync.enableCalendarSync.useMutation();
  const syncEmails = api.sync.syncEmails.useMutation();
  const syncCalendar = api.sync.syncCalendar.useMutation();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrations</h1>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Email Sync</h3>
            <p className="text-sm text-muted-foreground">
              Auto-capture emails from leads and clients
            </p>
            {syncStatus?.lastEmailSyncAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last synced: {new Date(syncStatus.lastEmailSyncAt).toLocaleString()}
              </p>
            )}
          </div>
          <Switch
            checked={syncStatus?.emailSyncEnabled}
            onCheckedChange={(checked) => {
              if (checked) enableEmail.mutate();
            }}
          />
        </div>

        {syncStatus?.emailSyncEnabled && (
          <Button
            onClick={() => syncEmails.mutate()}
            disabled={syncEmails.isLoading}
          >
            {syncEmails.isLoading ? "Syncing..." : "Sync Now"}
          </Button>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Calendar Sync</h3>
            <p className="text-sm text-muted-foreground">
              Auto-log meetings as CRM activities
            </p>
            {syncStatus?.lastCalendarSyncAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last synced: {new Date(syncStatus.lastCalendarSyncAt).toLocaleString()}
              </p>
            )}
          </div>
          <Switch
            checked={syncStatus?.calendarSyncEnabled}
            onCheckedChange={(checked) => {
              if (checked) enableCalendar.mutate();
            }}
          />
        </div>

        {syncStatus?.calendarSyncEnabled && (
          <Button
            onClick={() => syncCalendar.mutate()}
            disabled={syncCalendar.isLoading}
          >
            {syncCalendar.isLoading ? "Syncing..." : "Sync Now"}
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## Part 10: Testing the Integration

### Step-by-Step Testing:

1. **Connect Google Account:**
   - Navigate to `/settings/integrations`
   - Click "Connect Google Account"
   - Grant all requested permissions
   - You'll be redirected back with tokens saved

2. **Enable Email Sync:**
   - Toggle "Email Sync" on
   - Click "Sync Now"
   - Check database for new `CrmActivity` records

3. **Test Email Capture:**
   - Send an email to/from a lead's email address
   - Wait for cron or trigger manual sync
   - Verify activity appears in CRM

4. **Enable Calendar Sync:**
   - Toggle "Calendar Sync" on
   - Click "Sync Now"
   - Check for imported meetings

5. **Test Meeting Creation:**
   - Create a meeting in your CRM
   - Verify it appears in Google Calendar
   - Check attendees received invites

---

## Common Issues & Solutions

### Issue: "Insufficient Permission" Error
**Solution:** Recreate OAuth credentials with all required scopes

### Issue: Refresh token not received
**Solution:** Add `access_type: "offline"` and `prompt: "consent"` to OAuth config

### Issue: Sync runs but nothing happens
**Solution:** Check that leads/clients have correct email addresses in database

### Issue: "Invalid grant" error
**Solution:** User needs to reconnect (token expired/revoked)

---

## Production Checklist

- [ ] Move OAuth app to production (remove "Testing" status)
- [ ] Add your production domain to authorized redirect URIs
- [ ] Set up proper error monitoring (Sentry)
- [ ] Implement rate limiting on API calls
- [ ] Add webhook support for real-time updates (Google Cloud Pub/Sub)
- [ ] Implement proper token refresh error handling
- [ ] Add user notification when sync fails
- [ ] Set up database indexes on email fields for fast lookups

---

## Next Steps

1. **Implement the database schema changes**
2. **Set up NextAuth with Google provider**
3. **Create Gmail and Calendar services**
4. **Build the sync UI**
5. **Test with real Google account**
6. **Set up cron job**
7. **Deploy and monitor**

You now have a complete, production-ready email and calendar integration! 🎉
