import { randomUUID } from "node:crypto";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createFileVersion } from "../../domain/file/file-version";
import { FileVersionRepository } from "../../domain/file/file-version-repository";
import { NetworkRepository } from "../../domain/network/network-repository";
import { LamportClock } from "../ports/lamport-clock";

export interface AnnounceFileInput {
  networkId: string;
  ownerId: string;
  infoHash: string;
  filename: string;
  magnet?: string;
  size?: number;
}

export interface AnnounceFileResult {
  fileId: string;
  versionId: string;
  lamportTs: number;
}

export class AnnounceFile {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly versions: FileVersionRepository,
    private readonly clock: LamportClock,
  ) {}

  async execute(input: AnnounceFileInput): Promise<AnnounceFileResult> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }
    if (network.ownerId !== input.ownerId) {
      throw new ForbiddenError("only the owner can announce a new file");
    }

    const fileId = randomUUID();
    const lamportTs = await this.clock.next(input.networkId);
    const version = createFileVersion({
      networkId: input.networkId,
      fileId,
      parentVersionId: null,
      infoHash: input.infoHash,
      magnet: input.magnet ?? null,
      filename: input.filename,
      size: input.size ?? null,
      lamportTs,
      authorId: input.ownerId,
    });

    await this.versions.save(version);
    await this.networks.setActiveFile(input.networkId, fileId);

    return { fileId, versionId: version.versionId, lamportTs };
  }
}
