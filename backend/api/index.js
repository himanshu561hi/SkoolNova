const path = require("path");

let buildApp;
try {
  ({ buildApp } = require("../dist/app.js"));
} catch (e1) {
  try {
    ({ buildApp } = require(path.join(process.cwd(), "dist/app.js")));
  } catch (e2) {
    console.error("Failed to load buildApp from both relative and process.cwd() paths:", e1, e2);
  }
}

let app;

module.exports = async (req, res) => {
  try {
    // Preserve original URL if rewritten by Vercel
    if (req.headers && req.headers["x-matched-path"]) {
      req.url = req.headers["x-matched-path"];
    }

    if (!app) {
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
