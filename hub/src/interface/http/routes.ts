import { Router } from "express";
import { AuthController } from "./controllers/auth-controller";
import { validateBody } from "./middleware/validate";
import { credentialsSchema } from "./schemas/auth-schemas";
import { FilesController } from "./controllers/files-controller";

type Controllers = {
  authController: AuthController;
  filesController: FilesController;
};

export function buildRoutes(controllers: Controllers): Router {
  const router = Router();

  router.post("/register",validateBody(credentialsSchema),controllers.authController.register);
  router.post("/auth",validateBody(credentialsSchema),controllers.authController.login);

  router.get("/files", controllers.filesController.list);
  router.post("/announce", controllers.filesController.announce);

  return router;
}
