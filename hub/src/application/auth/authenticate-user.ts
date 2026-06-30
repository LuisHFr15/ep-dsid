import { InvalidCredentialsError } from "../../domain/errors/domain-error";
import { UserRepository } from "../../domain/user/user-repository";
import { PasswordHasher } from "../ports/password-hasher";
import { TokenService } from "../ports/token-service";

export interface AuthenticateUserInput {
  username: string;
  password: string;
}

export class AuthenticateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<string> {
    const user = await this.users.findByUsername(input.username);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const matches = await this.hasher.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new InvalidCredentialsError();
    }

    return this.tokens.sign({ sub: user.id, username: user.username });
  }
}
