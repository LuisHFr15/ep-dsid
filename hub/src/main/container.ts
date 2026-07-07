import { AuthenticateUser } from "../application/auth/authenticate-user";
import { RegisterUser } from "../application/auth/register-user";
import { CreateNetwork } from "../application/network/create-network";
import { DecideAccess } from "../application/network/decide-access";
import { ListNetworks } from "../application/network/list-networks";
import { ListPendingRequests } from "../application/network/list-pending-requests";
import { RequestAccess } from "../application/network/request-access";
import { GetCurrentFile } from "../application/file/get-current-file";
import { ListVersions } from "../application/file/list-versions";
import { PublishVersion } from "../application/file/publish-version";
import { RegisterHeartbeat } from "../application/presence/register-heartbeat";
import { Config } from "../infrastructure/config/env";
import { BcryptPasswordHasher } from "../infrastructure/crypto/bcrypt-password-hasher";
import { JwtTokenService } from "../infrastructure/crypto/jwt-token-service";
import { createDocumentClient } from "../infrastructure/dynamo/dynamo-client";
import { InMemoryPeerPresenceStore } from "../infrastructure/memory/in-memory-peer-presence-store";
import { DynamoFileVersionRepository } from "../infrastructure/dynamo/dynamo-file-version-repository";
import { DynamoLamportClock } from "../infrastructure/dynamo/dynamo-lamport-clock";
import { DynamoMembershipRepository } from "../infrastructure/dynamo/dynamo-membership-repository";
import { DynamoNetworkRepository } from "../infrastructure/dynamo/dynamo-network-repository";
import { DynamoUserRepository } from "../infrastructure/dynamo/dynamo-user-repository";
import { AuthController } from "../interface/http/controllers/auth-controller";
import { FileController } from "../interface/http/controllers/file-controller";
import { HeartbeatController } from "../interface/http/controllers/heartbeat-controller";
import { NetworkController } from "../interface/http/controllers/network-controller";
import { authenticate } from "../interface/http/middleware/authenticate";
import { HttpDeps } from "../interface/http/routes";

export function buildContainer(config: Config): HttpDeps {
  const documentClient = createDocumentClient(config);
  const table = config.aws.dynamoTable;

  const userRepository = new DynamoUserRepository(documentClient, table);
  const networkRepository = new DynamoNetworkRepository(documentClient, table);
  const membershipRepository = new DynamoMembershipRepository(documentClient, table);
  const versionRepository = new DynamoFileVersionRepository(documentClient, table);
  const lamportClock = new DynamoLamportClock(documentClient, table);
  const presenceStore = new InMemoryPeerPresenceStore();

  const passwordHasher = new BcryptPasswordHasher(config.bcryptRounds);
  const tokenService = new JwtTokenService(config.jwt.secret, config.jwt.expiresIn);

  const registerUser = new RegisterUser(userRepository, passwordHasher);
  const authenticateUser = new AuthenticateUser(userRepository, passwordHasher, tokenService);
  const createNetwork = new CreateNetwork(networkRepository, membershipRepository);
  const requestAccess = new RequestAccess(networkRepository, membershipRepository);
  const listPendingRequests = new ListPendingRequests(networkRepository, membershipRepository);
  const decideAccess = new DecideAccess(networkRepository, membershipRepository);
  const listNetworks = new ListNetworks(networkRepository);
  const publishVersion = new PublishVersion(
    networkRepository,
    membershipRepository,
    versionRepository,
    lamportClock,
  );
  const getCurrentFile = new GetCurrentFile(
    networkRepository,
    membershipRepository,
    versionRepository,
  );
  const listVersions = new ListVersions(
    networkRepository,
    membershipRepository,
    versionRepository,
  );
  const registerHeartbeat = new RegisterHeartbeat(
    networkRepository,
    membershipRepository,
    presenceStore,
  );

  const authController = new AuthController(registerUser, authenticateUser);
  const networkController = new NetworkController(
    createNetwork,
    requestAccess,
    listPendingRequests,
    decideAccess,
    listNetworks,
  );
  const fileController = new FileController(publishVersion, getCurrentFile, listVersions);
  const heartbeatController = new HeartbeatController(registerHeartbeat);

  return {
    authController,
    networkController,
    fileController,
    heartbeatController,
    authenticate: authenticate(tokenService),
  };
}
