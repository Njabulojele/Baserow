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
});

export type AppRouter = typeof appRouter;
