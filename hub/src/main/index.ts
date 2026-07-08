import "dotenv/config";
import { loadConfig } from "../infrastructure/config/env";
import { startFallbackScheduler } from "../infrastructure/scheduler/fallback-scheduler";
import { buildServer } from "../interface/http/server";
import { buildContainer } from "./container";

const config = loadConfig();
const container = buildContainer(config);
const app = buildServer(container.http);

app.listen(config.port, () => {
  console.log(`hub listening on ${config.port}`);
});

startFallbackScheduler(container.evaluateFallback, config.fallbackSweepIntervalMs, (err) =>
  console.error("fallback evaluation failed", err),
);
