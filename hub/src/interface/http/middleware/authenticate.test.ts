import { describe, it, expect } from "vitest";
import { authenticate } from "./authenticate";
import { UnauthorizedError } from "../../../domain/errors/domain-error";
import { TokenPayload, TokenService } from "../../../application/ports/token-service";

const tokens: TokenService = {
  sign: () => "signed",
  verify: (token: string): TokenPayload => {
    if (token !== "good") throw new Error("bad token");
    return { sub: "u1", username: "davi" };
  },
};

function run(authorization?: string) {
  const req = { header: (name: string) => (name === "authorization" ? authorization : undefined) };
  const res = { locals: {} as Record<string, unknown> };
  let error: unknown;
  let passed = false;
  const next = (err?: unknown) => {
    if (err) error = err;
    else passed = true;
  };
  authenticate(tokens)(req as never, res as never, next);
  return { res, error, passed };
}

describe("authenticate", () => {
  it("rejects a missing authorization header", () => {
    const { error, passed } = run(undefined);
    expect(passed).toBe(false);
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a non-bearer header", () => {
    const { error } = run("Basic abc");
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it("rejects an invalid token", () => {
    const { error } = run("Bearer wrong");
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it("accepts a valid token and populates res.locals.user", () => {
    const { res, error, passed } = run("Bearer good");
    expect(error).toBeUndefined();
    expect(passed).toBe(true);
    expect(res.locals.user).toEqual({ id: "u1", username: "davi" });
  });
});
