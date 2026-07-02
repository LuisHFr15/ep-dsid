import { Router } from "express";
import { AuthController } from "./controllers/auth-controller";
import { validateBody } from "./middleware/validate";
import { credentialsSchema } from "./schemas/auth-schemas";

export function buildRoutes(auth: AuthController): Router {
  const router = Router();

  router.post("/register", validateBody(credentialsSchema), auth.register);
  router.post("/auth", validateBody(credentialsSchema), auth.login);

  return router;
}
