import { Router } from "express";
import { AuthController } from "./controllers/auth-controller";
import { validateBody } from "./middleware/validate";
import { credentialsSchema } from "./schemas/auth-schemas";
import { FilesController } from "./controllers/files-controller";
import { HeartbeatController } from "./controllers/heartbeat-controller";


type Controllers = {
  authController: AuthController;
  filesController: FilesController;
  heartbeatController: HeartbeatController;
};

export function buildRoutes(controllers: Controllers): Router {
  const router = Router();

  router.post("/register",validateBody(credentialsSchema),controllers.authController.register);
  router.post("/auth",validateBody(credentialsSchema),controllers.authController.login);

  router.get("/files", controllers.filesController.list);
  router.get("/files/:file_id", controllers.filesController.details);
  router.post("/announce", controllers.filesController.announce);


  router.post("/heartbeat", controllers.heartbeatController.register);
  return router;
}
