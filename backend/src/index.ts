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
  if (!url.startsWith("/")) {
    url = "/" + url;
  }

  let payload: any = undefined;
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    if (req.body !== undefined && req.body !== null) {
      payload = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      if (chunks.length > 0) {
        payload = Buffer.concat(chunks);
      }
    }
  }

  const response = await app.inject({
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
}

export { app };

