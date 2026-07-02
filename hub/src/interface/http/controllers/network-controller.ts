import { NextFunction, Request, Response } from "express";
import { CreateNetwork } from "../../../application/network/create-network";
import { RequestAccess } from "../../../application/network/request-access";

export class NetworkController {
  constructor(
    private readonly createNetworkUseCase: CreateNetwork,
    private readonly requestAccessUseCase: RequestAccess,
  ) {}

  create = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, accessMode, updateMode } = res.locals.body;
      const network = await this.createNetworkUseCase.execute({
        ownerId: res.locals.user.id,
        title,
        description,
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
      });
      const status = result.status === "pending" ? 202 : 200;
      res.status(status).json(result);
    } catch (err) {
      next(err);
    }
  };
}
