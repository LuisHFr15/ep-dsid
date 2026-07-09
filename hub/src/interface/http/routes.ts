import { RequestHandler, Router } from "express";
import { AuthController } from "./controllers/auth-controller";
import { FileController } from "./controllers/file-controller";
import { PresenceController } from "./controllers/presence-controller";
import { NetworkController } from "./controllers/network-controller";
import { validateBody } from "./middleware/validate";
import { credentialsSchema } from "./schemas/auth-schemas";
import { heartbeatSchema } from "./schemas/heartbeat-schemas";
import {
  announceFileSchema,
  createNetworkSchema,
  decideAccessSchema,
  publishVersionSchema,
} from "./schemas/network-schemas";

export interface HttpDeps {
  authController: AuthController;
  networkController: NetworkController;
  fileController: FileController;
  presenceController: PresenceController;
  authenticate: RequestHandler;
}

export function buildRoutes(deps: HttpDeps): Router {
  const router = Router();
  const { authController, networkController, fileController, presenceController, authenticate } =
    deps;

  router.post("/register", validateBody(credentialsSchema), authController.register);
  router.post("/auth", validateBody(credentialsSchema), authController.login);

  router.get("/networks", authenticate, networkController.list);
  router.post(
    "/networks",
    authenticate,
    validateBody(createNetworkSchema),
    networkController.create,
  );
  router.post(
    "/networks/:networkId/access-requests",
    authenticate,
    networkController.requestAccess,
  );
  router.get(
    "/networks/:networkId/access-requests",
    authenticate,
    networkController.listPending,
  );
  router.post(
    "/networks/:networkId/access-decisions",
    authenticate,
    validateBody(decideAccessSchema),
    networkController.decide,
  );
  router.post(
    "/networks/:networkId/files",
    authenticate,
    validateBody(announceFileSchema),
    fileController.announce,
  );
  router.post(
    "/networks/:networkId/versions",
    authenticate,
    validateBody(publishVersionSchema),
    fileController.publish,
  );
  router.get("/networks/:networkId/file", authenticate, fileController.getCurrent);
  router.get("/networks/:networkId/versions", authenticate, fileController.listVersions);
  router.post(
    "/networks/:networkId/versions/:versionId/promote",
    authenticate,
    fileController.promote,
  );

  router.get("/networks/:networkId/peers", authenticate, presenceController.listPeers);

  router.post("/heartbeat", authenticate, validateBody(heartbeatSchema), presenceController.register);

  return router;
}
