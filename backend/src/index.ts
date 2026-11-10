import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

if (!process.env.VERCEL) {
  app.listen(env.PORT, env.HOST, () => {
    console.log(`🚀 SkoolNova ERP Backend running at http://${env.HOST}:${env.PORT}`);
    console.log(`🩺 Health check available at http://${env.HOST}:${env.PORT}/api/v1/health`);
  });
}

export default app;
export { app };
