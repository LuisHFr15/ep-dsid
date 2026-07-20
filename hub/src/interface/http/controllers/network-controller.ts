import { NextFunction, Request, Response } from "express";
import { CreateNetwork } from "../../../application/network/create-network";
import { DecideAccess } from "../../../application/network/decide-access";
import { ListNetworks } from "../../../application/network/list-networks";
import { ListPendingRequests } from "../../../application/network/list-pending-requests";
import { RequestAccess } from "../../../application/network/request-access";

export class NetworkController {
  constructor(
    private readonly createNetworkUseCase: CreateNetwork,
    private readonly requestAccessUseCase: RequestAccess,
    private readonly listPendingUseCase: ListPendingRequests,
    private readonly decideAccessUseCase: DecideAccess,
    private readonly listNetworksUseCase: ListNetworks,
  ) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
      const networks = await this.listNetworksUseCase.execute({
        requesterId: res.locals.user.id,
        q,
        tag,
      });
      res.json(networks);
    } catch (err) {
      next(err);
    }
  };

  create = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, tags, accessMode, updateMode } = res.locals.body;
      const network = await this.createNetworkUseCase.execute({
        ownerId: res.locals.user.id,
        ownerUsername: res.locals.user.username,
        title,
        description,
        tags,
        accessMode,
        updateMode,
      });
      res.status(201).json(network);
    } catch (err) {
      next(err);
    }
  };

  requestAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.requestAccessUseCase.execute({
        networkId: String(req.params.networkId),
        userId: res.locals.user.id,
        username: res.locals.user.username,
      });
      const status = result.status === "pending" ? 202 : 200;
      res.status(status).json(result);
    } catch (err) {
      next(err);
    }
  };

  listPending = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pending = await this.listPendingUseCase.execute({
        networkId: String(req.params.networkId),
        requesterId: res.locals.user.id,
      });
      res.json(pending);
    } catch (err) {
      next(err);
    }
  };

  decide = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, decision } = res.locals.body;
      const result = await this.decideAccessUseCase.execute({
        networkId: String(req.params.networkId),
        ownerId: res.locals.user.id,
        userId,
        decision,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
