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
});

export type AppRouter = typeof appRouter;
