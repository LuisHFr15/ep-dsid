import { FileVersion } from "./file-version";

export interface FileVersionRepository {
  save(version: FileVersion): Promise<void>;
  findCurrent(networkId: string): Promise<FileVersion | null>;
  findByVersionId(networkId: string, versionId: string): Promise<FileVersion | null>;
  listConcurrent(networkId: string, parentVersionId: string): Promise<FileVersion[]>;
  listVersions(networkId: string): Promise<FileVersion[]>;
}
