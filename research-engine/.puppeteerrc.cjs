const { join } = require("path");

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to be within the project directory.
  // This ensures it's captured in the build artifact on Render.
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
