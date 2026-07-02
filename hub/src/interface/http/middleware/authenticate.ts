import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../domain/errors/domain-error";
import { TokenService } from "../../../application/ports/token-service";

export function authenticate(tokens: TokenService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      return next(new UnauthorizedError());
    }

    const token = header.slice("Bearer ".length).trim();
    try {
      const payload = tokens.verify(token);
      res.locals.user = { id: payload.sub, username: payload.username };
      next();
    } catch {
      next(new UnauthorizedError("invalid token"));
    }
  };
}
