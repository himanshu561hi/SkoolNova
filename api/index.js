const path = require("path");
const fs = require("fs");

function loadBuildApp() {
  const candidatePaths = [
    path.join(__dirname, "../backend/dist/app.js"),
    path.join(__dirname, "./backend/dist/app.js"),
    path.join(process.cwd(), "backend/dist/app.js"),
    path.join(process.cwd(), "dist/app.js"),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const mod = require(candidate);
        if (mod && mod.buildApp) {
          return mod.buildApp;
        }
      }
    } catch (e) {}
  }

  try {
    const mod = require("../backend/dist/app.js");
    return mod.buildApp;
  } catch (err) {}

  return null;
}

let buildApp = loadBuildApp();
let app;

module.exports = async (req, res) => {
  try {
    if (req.headers && req.headers["x-matched-path"]) {
      req.url = req.headers["x-matched-path"];
    }

    if (!app) {
      if (!buildApp) {
        buildApp = loadBuildApp();
      }
      if (!buildApp) {
        throw new Error("Could not find buildApp. Ensure backend build succeeded.");
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
    console.error("Vercel Invocation Error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Serverless Error", message: err.message }));
    }
  }
};
