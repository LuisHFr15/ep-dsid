import { User } from "./user";

export interface UserRepository {
  save(user: User): Promise<void>;
  findByUsername(username: string): Promise<User | null>;
}
