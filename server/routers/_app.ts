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
});

export type AppRouter = typeof appRouter;
