import { Request, Response, NextFunction } from "express";
import { RegisterHeartbeat } from "../../../application/heartbeat/register-heartbeat";

export class HeartbeatController {
  constructor(private readonly registerHeartbeat: RegisterHeartbeat) {}

  register = (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = this.registerHeartbeat.execute(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}