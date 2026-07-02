import { NextFunction, Request, Response } from "express";
import { PublishVersion } from "../../../application/file/publish-version";

export class FileController {
  constructor(private readonly publishVersionUseCase: PublishVersion) {}

  publish = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { infoHash, filename, magnet, size, parentVersionId } = res.locals.body;
      const result = await this.publishVersionUseCase.execute({
        networkId: String(req.params.networkId),
        authorId: res.locals.user.id,
        infoHash,
        filename,
        magnet,
        size,
        parentVersionId,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };
}
