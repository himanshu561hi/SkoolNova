import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = buildApp();

async function start() {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 SkoolNova ERP Backend running at http://${env.HOST}:${env.PORT}`);
    console.log(`🩺 Health check available at http://${env.HOST}:${env.PORT}/api/v1/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Only listen locally or on non-serverless container environments
if (!process.env.VERCEL) {
  void start();

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\n🛑 Received ${signal}. Gracefully closing server...`);
      try {
        await app.close();
        console.log("✅ Server closed successfully.");
        process.exit(0);
      } catch (err) {
        console.error("❌ Error during server closure:", err);
        process.exit(1);
      }
    });
  }
}

export default async function handler(req: any, res: any) {
  await app.ready();
  return new Promise((resolve, reject) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    res.on("error", reject);
    app.server.emit("request", req, res);
  });
}

export { app };
