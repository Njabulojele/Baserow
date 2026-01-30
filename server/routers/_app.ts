import { router } from "../trpc";
import { taskRouter } from "./task";
import { projectRouter } from "./project";
import { analyticsRouter } from "./analytics";
import { planningRouter } from "./planning";
import { wellbeingRouter } from "./wellbeing";

export const appRouter = router({
  task: taskRouter,
  project: projectRouter,
  analytics: analyticsRouter,
  planning: planningRouter,
  wellbeing: wellbeingRouter,
});

export type AppRouter = typeof appRouter;
