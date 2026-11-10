const path = require("path");
const fs = require("fs");

function loadApp() {
  const candidatePaths = [
    path.join(__dirname, "../backend/dist/app.js"),
    path.join(__dirname, "./backend/dist/app.js"),
    path.join(process.cwd(), "backend/dist/app.js"),
    path.join(process.cwd(), "dist/app.js"),
    path.join(__dirname, "../dist/app.js"),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const mod = require(candidate);
        if (mod && mod.createApp) {
          return mod.createApp();
        }
        if (mod && (mod.app || mod.default)) {
          return mod.app || mod.default;
        }
      }
    } catch (e) {
      console.warn("Could not load from candidate:", candidate, e.message);
    }
  }

  try {
    const mod = require("../backend/dist/app.js");
    return mod.createApp ? mod.createApp() : (mod.app || mod.default);
  } catch (err) {
    console.error("Direct require fallback failed:", err.message);
  }

  return null;
}

let app;

function getApp() {
  if (!app) {
    app = loadApp();
    if (!app) {
      throw new Error("Could not initialize Express application. Ensure backend build succeeded.");
    }
  }
  return app;
}

module.exports = (req, res) => {
  try {
    const expressApp = getApp();

    let url = req.url || "/";
    const matchedPath = req.headers && req.headers["x-matched-path"];
    if (matchedPath && typeof matchedPath === "string" && !matchedPath.includes("[")) {
      const queryIndex = url.indexOf("?");
      const queryString = queryIndex !== -1 ? url.substring(queryIndex) : "";
      url = matchedPath + queryString;
    }
    if (!url || url === "" || url === "/api" || url === "/api/") {
      url = "/";
    }
    req.url = url;

    return expressApp(req, res);
  } catch (err) {
    console.error("Vercel Serverless Invocation Error:", err);
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
