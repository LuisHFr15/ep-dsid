import { randomUUID } from "node:crypto";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export function createUser(username: string, passwordHash: string): User {
  return {
    id: randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
}
