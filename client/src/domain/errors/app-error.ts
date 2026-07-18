export abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthError extends AppError {
  readonly code = "AUTH_ERROR";
}

export class NetworkError extends AppError {
  readonly code = "NETWORK_ERROR";
}

export class FileError extends AppError {
  readonly code = "FILE_ERROR";
}

export class WorkspaceError extends AppError {
  readonly code = "WORKSPACE_ERROR";
}

export class HubConnectionError extends AppError {
  readonly code = "HUB_CONNECTION_ERROR";

  constructor(method: string, path: string, status: number) {
    super(`Falha ao comunicar com o hub: ${method} ${path} retornou ${status}`);
  }
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
}
