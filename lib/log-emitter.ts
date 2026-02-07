/**
 * Log Emitter utility
 * Sends log messages to the Research Engine WebSocket server via HTTP
 */
export async function emitResearchLog(researchId: string, message: string) {
  const ENGINE_URL =
    process.env.NEXT_PUBLIC_RESEARCH_ENGINE_URL || "http://localhost:3010";

  try {
    // Fire and forget - don't await the result to avoid slowing down the agent
    fetch(`${ENGINE_URL}/emit-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ researchId, message }),
    }).catch((err) => {
      // Silently fail if research engine is offline, to not break the agent
      // console.warn("Failed to emit log:", err.message);
    });
  } catch (error) {
    // Ignore errors
  }
}
