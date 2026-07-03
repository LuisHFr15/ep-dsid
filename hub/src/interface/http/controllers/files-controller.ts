import { Request, Response, NextFunction } from "express";
import { AnnounceFile } from "../../../application/files/announce-file";
import { ListFiles } from "../../../application/files/list-files";

export class FilesController {
  constructor(
    private readonly announceFile: AnnounceFile,
    private readonly listFiles: ListFiles
  ) {}

  announce = (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = this.announceFile.execute(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  list = (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = this.listFiles.execute();
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}