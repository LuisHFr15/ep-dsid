import express, { Express } from "express";
import { AuthController } from "./controllers/auth-controller";
import { errorHandler } from "./middleware/error-handler";
import { buildRoutes } from "./routes";
import { FilesController } from "./controllers/files-controller";
import { HeartbeatController } from "./controllers/heartbeat-controller";

type Controllers = {
  authController: AuthController;
  filesController: FilesController;
  heartbeatController: HeartbeatController;
};

export function buildServer(controllers: Controllers): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(buildRoutes(controllers));
  app.use(errorHandler);

  return app;
}
