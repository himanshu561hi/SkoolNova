import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = buildApp();

// If running locally, listen. On Vercel, serverless handler is invoked.
if (!process.env.VERCEL) {
  app
    .listen({ port: env.PORT, host: env.HOST })
    .then(() => {
      console.log(`🚀 SkoolNova ERP Backend running at http://${env.HOST}:${env.PORT}`);
      console.log(`🩺 Health check available at http://${env.HOST}:${env.PORT}/api/v1/health`);
    })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}

export default async function handler(req: any, res: any) {
  await app.ready();

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

  return new Promise((resolve, reject) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    res.on("error", reject);
    app.server.emit("request", req, res);
  });
}

export { app };
