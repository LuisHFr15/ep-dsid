import "dotenv/config";
import { loadConfig } from "../infrastructure/config/env";
import { buildContainer } from "./container";

const config = loadConfig();
const container = buildContainer(config);

let running = true;

async function loop() {
  console.log("fallback worker started");
  while (running) {
    try {
      await container.worker.processBatch();
    } catch (err) {
      console.error("worker loop error", err);
    }
  }
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  running = false;
  console.log(`received ${signal}, shutting down`);

  const forced = setTimeout(() => process.exit(0), 5000);
  forced.unref();

  try {
    await container.seeder.close();
  } catch (err) {
    console.error("seeder close failed", err);
  }
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void loop();
