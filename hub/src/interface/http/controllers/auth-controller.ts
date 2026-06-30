import { NextFunction, Request, Response } from "express";
import { AuthenticateUser } from "../../../application/auth/authenticate-user";
import { RegisterUser } from "../../../application/auth/register-user";

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly authenticateUser: AuthenticateUser,
  ) {}

  register = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, password } = res.locals.body;
      const registered = await this.registerUser.execute({ username: user, password });
      res.status(201).json(registered);
    } catch (err) {
      next(err);
    }
  };

  login = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, password } = res.locals.body;
      const jwt = await this.authenticateUser.execute({ username: user, password });
      res.json({ jwt });
    } catch (err) {
      next(err);
    }
  };
}
