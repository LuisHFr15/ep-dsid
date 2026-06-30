import "dotenv/config";
import { loadConfig } from "../infrastructure/config/env";
import { buildServer } from "../interface/http/server";
import { buildContainer } from "./container";

const config = loadConfig();
const { authController } = buildContainer(config);
const app = buildServer(authController);

app.listen(config.port, () => {
  console.log(`hub listening on ${config.port}`);
});
