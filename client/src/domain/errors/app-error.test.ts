import { describe, it, expect } from "vitest";
import { AppError, AuthError, HubConnectionError } from "./app-error.js";

describe("AppError hierarchy", () => {
  it("carries a stable code for IPC transport", () => {
    const err = new AuthError("credenciais inválidas");
    expect(err.code).toBe("AUTH_ERROR");
    expect(err.message).toBe("credenciais inválidas");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it("formats hub connection errors with context", () => {
    const err = new HubConnectionError("POST", "/auth", 500);
    expect(err.code).toBe("HUB_CONNECTION_ERROR");
    expect(err.message).toContain("POST /auth");
    expect(err.message).toContain("500");
  });
});
