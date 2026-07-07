import { NextFunction, Request, Response } from "express";
import { RegisterHeartbeat } from "../../../application/presence/register-heartbeat";

export class HeartbeatController {
  constructor(private readonly registerHeartbeatUseCase: RegisterHeartbeat) {}

  register = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { networkId, peerId } = res.locals.body;
      const result = await this.registerHeartbeatUseCase.execute({
        networkId,
        peerId,
        userId: res.locals.user.id,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
