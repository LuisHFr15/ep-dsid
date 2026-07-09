import { NextFunction, Request, Response } from "express";
import { AnnounceFile } from "../../../application/file/announce-file";
import { GetCurrentFile } from "../../../application/file/get-current-file";
import { ListVersions } from "../../../application/file/list-versions";
import { PromoteVersion } from "../../../application/file/promote-version";
import { PublishVersion } from "../../../application/file/publish-version";

export class FileController {
  constructor(
    private readonly publishVersionUseCase: PublishVersion,
    private readonly getCurrentFileUseCase: GetCurrentFile,
    private readonly listVersionsUseCase: ListVersions,
    private readonly promoteVersionUseCase: PromoteVersion,
    private readonly announceFileUseCase: AnnounceFile,
  ) {}

  announce = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { infoHash, filename, magnet, size } = res.locals.body;
      const result = await this.announceFileUseCase.execute({
        networkId: String(req.params.networkId),
        ownerId: res.locals.user.id,
        infoHash,
        filename,
        magnet,
        size,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

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

  listVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dag = await this.listVersionsUseCase.execute({
        networkId: String(req.params.networkId),
        requesterId: res.locals.user.id,
      });
      res.json(dag);
    } catch (err) {
      next(err);
    }
  };

  promote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.promoteVersionUseCase.execute({
        networkId: String(req.params.networkId),
        versionId: String(req.params.versionId),
        actorId: res.locals.user.id,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };
}
