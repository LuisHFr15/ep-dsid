import { NextFunction, Request, Response } from "express";
import { GetCurrentFile } from "../../../application/file/get-current-file";
import { PublishVersion } from "../../../application/file/publish-version";

export class FileController {
  constructor(
    private readonly publishVersionUseCase: PublishVersion,
    private readonly getCurrentFileUseCase: GetCurrentFile,
  ) {}

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

  getCurrent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const versionId = typeof req.query.versionId === "string" ? req.query.versionId : undefined;
      const resolved = await this.getCurrentFileUseCase.execute({
        networkId: String(req.params.networkId),
        requesterId: res.locals.user.id,
        versionId,
      });
      res.json(resolved);
    } catch (err) {
      next(err);
    }
  };
}
