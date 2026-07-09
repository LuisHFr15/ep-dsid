import { NextFunction, Request, Response } from "express";
import { ListActivePeers } from "../../../application/presence/list-active-peers";
import { RegisterHeartbeat } from "../../../application/presence/register-heartbeat";

export class PresenceController {
  constructor(
    private readonly registerHeartbeatUseCase: RegisterHeartbeat,
    private readonly listActivePeersUseCase: ListActivePeers,
  ) {}

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

  listPeers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.listActivePeersUseCase.execute({
        networkId: String(req.params.networkId),
        requesterId: res.locals.user.id,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
