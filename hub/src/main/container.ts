import { AuthenticateUser } from "../application/auth/authenticate-user";
import { RegisterUser } from "../application/auth/register-user";
import { Config } from "../infrastructure/config/env";
import { BcryptPasswordHasher } from "../infrastructure/crypto/bcrypt-password-hasher";
import { JwtTokenService } from "../infrastructure/crypto/jwt-token-service";
import { createDocumentClient } from "../infrastructure/dynamo/dynamo-client";
import { DynamoUserRepository } from "../infrastructure/dynamo/dynamo-user-repository";
import { AuthController } from "../interface/http/controllers/auth-controller";

export function buildContainer(config: Config) {
  const documentClient = createDocumentClient(config);
  const userRepository = new DynamoUserRepository(documentClient, config.aws.dynamoTable);
  const passwordHasher = new BcryptPasswordHasher(config.bcryptRounds);
  const tokenService = new JwtTokenService(config.jwt.secret, config.jwt.expiresIn);

  const registerUser = new RegisterUser(userRepository, passwordHasher);
  const authenticateUser = new AuthenticateUser(userRepository, passwordHasher, tokenService);

  const authController = new AuthController(registerUser, authenticateUser);

  return { authController };
}
