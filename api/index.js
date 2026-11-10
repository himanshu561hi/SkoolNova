const path = require("path");
const fs = require("fs");

function loadBuildApp() {
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

async function getApp() {
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
  return app;
}

module.exports = async (req, res) => {
  try {
    const fastify = await getApp();

    let url = req.url || "/";
    const matchedPath = req.headers && req.headers["x-matched-path"];
    if (matchedPath && typeof matchedPath === "string" && !matchedPath.includes("[")) {
      const queryIndex = url.indexOf("?");
      const queryString = queryIndex !== -1 ? url.substring(queryIndex) : "";
      url = matchedPath + queryString;
    }
    if (!url.startsWith("/")) {
      url = "/" + url;
    }

    let payload = undefined;
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      if (req.body !== undefined && req.body !== null) {
        payload = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
      } else {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) {
          payload = Buffer.concat(chunks);
        }
      }
    }

    const response = await fastify.inject({
      method: req.method || "GET",
      url,
      headers: req.headers,
      payload,
    });

    res.statusCode = response.statusCode;
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    }
    return res.end(response.rawPayload);
  } catch (err) {
    console.error("Vercel Invocation Error:", err);
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
