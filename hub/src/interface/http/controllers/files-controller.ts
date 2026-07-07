import { Request, Response, NextFunction } from "express";
import { AnnounceFile } from "../../../application/files/announce-file";
import { ListFiles } from "../../../application/files/list-files";
import { GetFileDetails } from "../../../application/files/get-file-details";

export class FilesController {
  constructor(
    private readonly announceFile: AnnounceFile,
    private readonly listFiles: ListFiles,
    private readonly getFileDetails: GetFileDetails
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

    details = (req: Request, res: Response, next: NextFunction) => {
    try {
        const file_id = req.params.file_id;

        if (typeof file_id !== "string") {
        res.status(400).json({
            error: {
            code: "INVALID_FILE_ID",
            message: "file_id must be a string",
            },
        });
        return;
        }

        const result = this.getFileDetails.execute(file_id);

        if (!result) {
        res.status(404).json({
            error: {
            code: "FILE_NOT_FOUND",
            message: "file not found",
            },
        });
        return;
        }

        res.json(result);
    } catch (error) {
        next(error);
    }
    };
}