import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/** Maximum allowed simultaneous Chrome/Chromium processes */
const MAX_CHROME_PROCESSES = 4;

/**
 * Chrome Watchdog — kills zombie Chrome/Chromium processes.
 *
 * This is designed to run as an Inngest cron every 15 minutes.
 * It counts running Chrome processes and kills excess ones to prevent
 * memory leaks from crashed Puppeteer instances.
 */
export async function runChromeWatchdog(): Promise<{
  found: number;
  killed: number;
}> {
  const logger = (globalThis as any).logger || console;

  try {
    // List all Chrome/Chromium processes (except the grep itself)
    const { stdout } = await execAsync(
      "ps aux | grep -i '[c]hrom' | grep -v 'grep' || true",
    );

    const lines = stdout
      .trim()
      .split("\n")
      .filter((line) => line.trim().length > 0);

    const found = lines.length;

    if (found <= MAX_CHROME_PROCESSES) {
      logger.info(
        `[ChromeWatchdog] ${found} Chrome process(es) running — within limit of ${MAX_CHROME_PROCESSES}. No action.`,
      );
      return { found, killed: 0 };
    }

    // Kill excess processes (oldest first — they appear first in ps output)
    const excessCount = found - MAX_CHROME_PROCESSES;
    const processesToKill = lines.slice(0, excessCount);
    let killed = 0;

    for (const line of processesToKill) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[1]; // PID is the second column in `ps aux`

      if (pid) {
        try {
          process.kill(parseInt(pid, 10), "SIGKILL");
          killed++;
          logger.warn(
            `[ChromeWatchdog] Killed zombie Chrome process PID=${pid}`,
          );
        } catch (err: any) {
          // Process may have already exited
          if (err.code !== "ESRCH") {
            logger.error(
              `[ChromeWatchdog] Failed to kill PID=${pid}: ${err.message}`,
            );
          }
        }
      }
    }

    logger.warn(
      `[ChromeWatchdog] Found ${found} Chrome processes (limit: ${MAX_CHROME_PROCESSES}). Killed ${killed} excess.`,
    );
    return { found, killed };
  } catch (error: any) {
    logger.error(`[ChromeWatchdog] Error: ${error.message}`);
    return { found: 0, killed: 0 };
  }
}
