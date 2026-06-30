import express, { Express } from "express";
import { AuthController } from "./controllers/auth-controller";
import { errorHandler } from "./middleware/error-handler";
import { buildRoutes } from "./routes";

export function buildServer(auth: AuthController): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(buildRoutes(auth));
  app.use(errorHandler);

  return app;
}
