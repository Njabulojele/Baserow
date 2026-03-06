import { router } from "../trpc";
import { taskRouter } from "./task";
import { projectRouter } from "./project";
import { analyticsRouter } from "./analytics";
import { planningRouter } from "./planning";
import { wellbeingRouter } from "./wellbeing";
import { clientRouter } from "./client";
import { communicationRouter } from "./communication";
import { strategyRouter } from "./strategy";
import { calendarRouter } from "./calendar";
import { meetingRouter } from "./meeting";
import { noteRouter } from "./note";
import { researchRouter } from "./research";
import { settingsRouter } from "./settings";

// CRM routers
import { crmLeadRouter } from "./crmLead";
import { pipelineRouter } from "./pipeline";
import { dealRouter } from "./deal";
import { clientHealthRouter } from "./clientHealth";
import { crmAutomationRouter } from "./crmAutomation";
import { crmActivityRouter } from "./crmActivity";

// Canvas
import { canvasRouter } from "./canvas";

// Team
import { teamRouter } from "./team";

// Notifications
import { notificationRouter } from "./notification";

// Global Search
import { searchRouter } from "./search";

// Webhooks
import { webhookRouter } from "./webhook";

// GDPR
import { gdprRouter } from "./gdpr";

// AI Context
import { aiContextRouter } from "./aiContext";

// API Keys & Billing
import { apiKeyRouter } from "./apiKey";

// AI Chat
import { chatRouter } from "./chat";

// Daily Operating System
import { habitRouter } from "./habit";
import { contentIdeaRouter } from "./contentIdea";
import { proposalTemplateRouter } from "./proposalTemplate";
import { prospectingRouter } from "./prospecting";

export const appRouter = router({
  task: taskRouter,
  project: projectRouter,
  analytics: analyticsRouter,
  planning: planningRouter,
  wellbeing: wellbeingRouter,
  clients: clientRouter,
  communication: communicationRouter,
  strategy: strategyRouter,
  calendar: calendarRouter,
  meeting: meetingRouter,
  note: noteRouter,
  research: researchRouter,
  settings: settingsRouter,

  // CRM routes
  crmLead: crmLeadRouter,
  pipeline: pipelineRouter,
  deal: dealRouter,
  clientHealth: clientHealthRouter,
  crmAutomation: crmAutomationRouter,
  crmActivity: crmActivityRouter,

  // Canvas
  canvas: canvasRouter,

  // Team
  team: teamRouter,

  // Notifications
  notification: notificationRouter,

  // Global Search
  search: searchRouter,

  // Webhooks
  webhook: webhookRouter,

  // GDPR
  gdpr: gdprRouter,

  // AI Context
  aiContext: aiContextRouter,

  // API Keys & Billing
  apiKey: apiKeyRouter,

  // AI Chat
  chat: chatRouter,

  // Daily Operating System
  habit: habitRouter,
  contentIdea: contentIdeaRouter,
  proposalTemplate: proposalTemplateRouter,
  prospecting: prospectingRouter,
});

export type AppRouter = typeof appRouter;
