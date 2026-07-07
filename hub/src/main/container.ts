import { AuthenticateUser } from "../application/auth/authenticate-user";
import { RegisterUser } from "../application/auth/register-user";
import { Config } from "../infrastructure/config/env";
import { BcryptPasswordHasher } from "../infrastructure/crypto/bcrypt-password-hasher";
import { JwtTokenService } from "../infrastructure/crypto/jwt-token-service";
import { createDocumentClient } from "../infrastructure/dynamo/dynamo-client";
import { DynamoUserRepository } from "../infrastructure/dynamo/dynamo-user-repository";
import { AuthController } from "../interface/http/controllers/auth-controller";
import { AnnounceFile } from "../application/files/announce-file";
import { ListFiles } from "../application/files/list-files";
import { MemoryStore } from "../infrastructure/memory/memory-store";
import { FilesController } from "../interface/http/controllers/files-controller";
import { RegisterHeartbeat } from "../application/heartbeat/register-heartbeat";
import { HeartbeatController } from "../interface/http/controllers/heartbeat-controller";
import { GetFileDetails } from "../application/files/get-file-details";

export function buildContainer(config: Config) {
  const documentClient = createDocumentClient(config);
  const userRepository = new DynamoUserRepository(documentClient, config.aws.dynamoTable);
  const passwordHasher = new BcryptPasswordHasher(config.bcryptRounds);
  const tokenService = new JwtTokenService(config.jwt.secret, config.jwt.expiresIn);

  const registerUser = new RegisterUser(userRepository, passwordHasher);
  const authenticateUser = new AuthenticateUser(userRepository, passwordHasher, tokenService);

  const authController = new AuthController(registerUser, authenticateUser);
  
  const memoryStore = new MemoryStore();
  const announceFile = new AnnounceFile(memoryStore);
  const listFiles = new ListFiles(memoryStore);
  const getFileDetails = new GetFileDetails(memoryStore);

  const filesController = new FilesController(
    announceFile,
    listFiles,
    getFileDetails
  );

  const registerHeartbeat = new RegisterHeartbeat(memoryStore);
  const heartbeatController = new HeartbeatController(registerHeartbeat);

  return { authController, filesController, heartbeatController };
}
