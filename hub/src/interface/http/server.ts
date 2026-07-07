import express, { Express } from "express";
import { errorHandler } from "./middleware/error-handler";
import { buildRoutes, HttpDeps } from "./routes";

export function buildServer(deps: HttpDeps): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(buildRoutes(deps));
  app.use(errorHandler);

  return app;
}
