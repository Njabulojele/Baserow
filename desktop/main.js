const { app, BrowserWindow, powerMonitor, Notification } = require("electron");
const http = require("http");

let mainWindow;

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

  // System Idle Monitoring & Active Window Tracking Loop
  setInterval(() => {
    const idleState = powerMonitor.getSystemIdleState(300); // 5 minute threshold
    if (idleState === "idle") {
      console.log("[Electron Tracker] System is IDLE. Pausing active session tracking.");
    } else {
      // Dispatch heartbeat ping to Go Backend Engine
      sendHeartbeatPing();
    }
  }, 30000);
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
  if (process.platform !== "darwin") app.quit();
});
