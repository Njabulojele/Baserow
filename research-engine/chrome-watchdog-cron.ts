import { Inngest } from "inngest";
import { runChromeWatchdog } from "./lib/chrome-watchdog";

const inngest = new Inngest({
  id: "baserow-research",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/**
 * Chrome Watchdog Cron — runs every 15 minutes.
 * Counts running Chrome/Chromium processes and kills excess zombies
 * that weren't properly cleaned up by Puppeteer.
 */
export const chromeWatchdogCron = inngest.createFunction(
  {
    id: "chrome-watchdog",
    name: "Chrome Zombie Process Watchdog",
  },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const result = await step.run("kill-zombies", async () => {
      return await runChromeWatchdog();
    });

    return result;
  },
);
