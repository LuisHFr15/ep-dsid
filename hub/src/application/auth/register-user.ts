import { createUser } from "../../domain/user/user";
import { UserRepository } from "../../domain/user/user-repository";
import { PasswordHasher } from "../ports/password-hasher";

export interface RegisterUserInput {
  username: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  username: string;
  createdAt: string;
}

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisteredUser> {
    const passwordHash = await this.hasher.hash(input.password);
    const user = createUser(input.username, passwordHash);
    await this.users.save(user);

    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }
}
