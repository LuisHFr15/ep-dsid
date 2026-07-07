import "dotenv/config";
import { loadConfig } from "../infrastructure/config/env";
import { buildServer } from "../interface/http/server";
import { buildContainer } from "./container";

const config = loadConfig();
const controllers = buildContainer(config);
const app = buildServer(controllers);

app.listen(config.port, () => {
  console.log(`hub listening on ${config.port}`);
});
