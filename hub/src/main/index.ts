import "dotenv/config";
import { loadConfig } from "../infrastructure/config/env";
import { startInterval } from "../infrastructure/scheduler/interval-scheduler";
import { buildServer } from "../interface/http/server";
import { buildContainer } from "./container";

const config = loadConfig();
const container = buildContainer(config);
const app = buildServer(container.http);

const server = app.listen(config.port, () => {
  console.log(`hub listening on ${config.port}`);
});

const stopFallback = startInterval(
  () => container.evaluateFallback.evaluateAll(),
  config.fallbackSweepIntervalMs,
  (err) => console.error("fallback evaluation failed", err),
);

const stopFlush = startInterval(
  () => container.presence.flush(),
  config.presenceFlushIntervalMs,
  (err) => console.error("presence flush failed", err),
);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`received ${signal}, shutting down`);

  stopFallback();
  stopFlush();

  const forced = setTimeout(() => process.exit(0), 5000);
  forced.unref();

  try {
    await container.presence.flush();
  } catch (err) {
    console.error("final presence flush failed", err);
  }

  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
