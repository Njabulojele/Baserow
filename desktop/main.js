const { app, BrowserWindow, powerMonitor, Notification } = require("electron");
const http = require("http");

let mainWindow;

// In-Memory Tracker State Machine
let currentSession = {
  appName: "Baserow Productivity OS",
  title: "Analytics Command Center",
  startTime: Date.now(),
};

const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "Baserow Productivity OS",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL("http://localhost:3000/dashboard");

  // Start Edge-Triggered Active Window Tracking Loop
  startActiveWindowTracker();

  // Dispatch 13s Heartbeat Keep-Alive Ping
  setInterval(() => {
    const idleState = powerMonitor.getSystemIdleState(300);
    if (idleState !== "idle") {
      sendHeartbeatPing();
    }
  }, 13000);
}

/**
 * Event-Driven Edge-Triggered Active Window Tracking State Machine
 * Only writes to backend when a context switch happens or when user goes idle.
 */
function startActiveWindowTracker() {
  let activeWinModule = null;
  try {
    activeWinModule = require("active-win");
  } catch (e) {
    console.log("[Electron Tracker] active-win native module not installed. Running native fallback tracker.");
  }

  setInterval(async () => {
    // 1. Check if user is idle
    const idleTime = powerMonitor.getSystemIdleTime();
    if (idleTime > IDLE_THRESHOLD_SECONDS) {
      closeCurrentSession();
      return;
    }

    let win = null;
    if (activeWinModule) {
      try {
        win = await activeWinModule();
      } catch (err) {}
    }

    const appName = win?.owner?.name || (mainWindow?.isFocused() ? "Baserow Productivity OS" : "Desktop Apps");
    const windowTitle = win?.title || (mainWindow?.isFocused() ? "Analytics Command Center" : "Active Window");

    // 2. Detect Context Switch (App or Window Title change)
    const isNewApp = appName !== currentSession.appName;
    const isNewWindow = windowTitle !== currentSession.title;

    if (isNewApp || isNewWindow) {
      closeCurrentSession(); // Save previous chunk to SQL/Go Backend

      // Start new session
      currentSession = {
        appName,
        title: windowTitle,
        startTime: Date.now(),
      };
    }
  }, 3000); // Poll window context every 3s
}

/**
 * Closes and persists the active session chunk when a context switch occurs.
 */
function closeCurrentSession() {
  if (!currentSession.appName) return;

  const durationSec = Math.floor((Date.now() - currentSession.startTime) / 1000);

  // Ignore micro-switches (cmd+tab past an app < 2s)
  if (durationSec >= 2) {
    postTracklogChunk({
      user_id: "user_demo",
      app_name: currentSession.appName,
      window_title: currentSession.title,
      duration_seconds: durationSec,
    });
  }

  currentSession.appName = ""; // Clear memory until next window focus
}

/**
 * Posts completed tracklog session chunk to Go backend & PostgreSQL/Neon.
 */
function postTracklogChunk(payload) {
  const data = JSON.stringify(payload);
  const req = http.request("http://localhost:8080/api/v1/tracklog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  });

  req.on("error", (err) => {
    console.error("[Tracklog Ingest Sync Warning]", err.message);
  });
  req.write(data);
  req.end();
}

function sendHeartbeatPing() {
  const req = http.request("http://localhost:8080/api/sessions/desktop_active/heartbeat", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  req.on("error", () => {});
  req.write(JSON.stringify({ timestamp: new Date().toISOString(), source: "electron_wrapper" }));
  req.end();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  closeCurrentSession();
  if (process.platform !== "darwin") app.quit();
});

