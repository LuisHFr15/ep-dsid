export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION";
  readonly status = 400;
}

export class InvalidCredentialsError extends AppError {
  readonly code = "INVALID_CREDENTIALS";
  readonly status = 401;

  constructor(message = "invalid username or password") {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT";
  readonly status = 409;
}
