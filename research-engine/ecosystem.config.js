module.exports = {
  apps: [
    {
      name: "baserow-research-engine",
      script: "dist/index.js",
      instances: process.env.WEB_CONCURRENCY || 1, // Utilize available CPU cores or specific number
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "1G", // Prevent OOM by restarting if memory exceeds 1GB
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      // Give the app time to finish active WebSockets and HTTP requests
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
