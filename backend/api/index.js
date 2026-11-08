const { buildApp } = require("../dist/app.js");

let app;

module.exports = async (req, res) => {
  try {
    if (!app) {
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
