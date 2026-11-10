import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

// Only listen locally or on long-running container environments
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`🚀 SkoolNova ERP Backend running at http://${env.HOST}:${env.PORT}`);
    console.log(`🩺 Health check available at http://${env.HOST}:${env.PORT}/api/v1/health`);
  });

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, () => {
      console.log(`\n🛑 Received ${signal}. Gracefully closing server...`);
      server.close((err) => {
        if (err) {
          console.error("❌ Error during server closure:", err);
          process.exit(1);
        }
        console.log("✅ Server closed successfully.");
        process.exit(0);
      });
    });
  }
}

export default app;
export { app };
