const path = require("path");
const fs = require("fs");

function loadBuildApp() {
  const candidatePaths = [
    path.join(__dirname, "../dist/app.js"),
    path.join(__dirname, "./dist/app.js"),
    path.join(process.cwd(), "dist/app.js"),
    path.join(process.cwd(), "backend/dist/app.js"),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const mod = require(candidate);
        if (mod && mod.buildApp) {
          return mod.buildApp;
        }
      }
    } catch (e) {
      console.warn("Could not load from candidate:", candidate, e.message);
    }
  }

  // Direct require fallback
  try {
    const mod = require("../dist/app.js");
    return mod.buildApp;
  } catch (err) {
    console.error("Direct require fallback failed:", err.message);
  }

  return null;
}

let buildApp = loadBuildApp();
let app;

module.exports = async (req, res) => {
  try {
    // Preserve original URL if rewritten by Vercel
    if (req.headers && req.headers["x-matched-path"]) {
      req.url = req.headers["x-matched-path"];
    }

    if (!app) {
      if (!buildApp) {
        buildApp = loadBuildApp();
      }
      if (!buildApp) {
        throw new Error(
          "Could not load buildApp from dist/app.js. Ensure 'npm run build' (tsc) executed successfully."
        );
      }
      app = buildApp();
      await app.ready();
    }

    return new Promise((resolve, reject) => {
      res.on("finish", resolve);
      res.on("close", resolve);
      res.on("error", reject);
      app.server.emit("request", req, res);
    });
  } catch (err) {
    console.error("Vercel Fastify Invocation Error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Internal Server Error",
          message: err.message,
          stack: err.stack,
        })
      );
    }
  }
};
