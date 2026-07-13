import "dotenv/config";
import { nextBackoffMs } from "../application/backoff";
import { restoreSeeding } from "../application/restore-seeding";
import { loadConfig } from "../infrastructure/config/env";
import { buildContainer } from "./container";

const LIVENESS_INTERVAL_MS = 60000;

const config = loadConfig();
const container = buildContainer(config);

function log(message: string, err?: unknown) {
  if (err !== undefined) {
    console.error(message, err);
  } else {
    console.log(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let running = true;

async function loop() {
  await restoreSeeding(container.state, container.seeder, log);

  console.log("fallback worker started");
  let failures = 0;
  while (running) {
    try {
      await container.worker.processBatch();
      failures = 0;
    } catch (err) {
      // Falha de consumo (rede/credencial): recua antes de tentar de novo
      // para nao virar busy-loop martelando a fila.
      const delay = nextBackoffMs(failures);
      failures++;
      log(`worker loop error, backing off ${delay}ms`, err);
      await sleep(delay);
    }
  }
}

async function reportLiveness() {
  try {
    const entries = await container.state.list();
    console.log(`alive: responsible for ${entries.length} file(s)`);
  } catch (err) {
    log("liveness check failed", err);
  }
}
const liveness = setInterval(() => void reportLiveness(), LIVENESS_INTERVAL_MS);
liveness.unref();

// Guardas de ultimo recurso: um erro solto nunca deve derrubar o seed silenciosamente.
process.on("uncaughtException", (err) => log("uncaught exception", err));
process.on("unhandledRejection", (reason) => log("unhandled rejection", reason));

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  running = false;
  clearInterval(liveness);
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
