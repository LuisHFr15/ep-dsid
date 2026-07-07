import { randomUUID } from "node:crypto";
import { NotFoundError } from "../../domain/errors/domain-error";
import { createFileVersion } from "../../domain/file/file-version";
import { FileVersionRepository } from "../../domain/file/file-version-repository";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";
import { LamportClock } from "../ports/lamport-clock";
import { assertCanContribute } from "../network/access-guards";

export interface PublishVersionInput {
  networkId: string;
  authorId: string;
  infoHash: string;
  filename: string;
  magnet?: string;
  size?: number;
  parentVersionId?: string;
}

export interface PublishVersionResult {
  fileId: string;
  versionId: string;
  lamportTs: number;
  parentVersionId: string | null;
  concurrent: boolean;
}

export class PublishVersion {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
    private readonly versions: FileVersionRepository,
    private readonly clock: LamportClock,
  ) {}

  async execute(input: PublishVersionInput): Promise<PublishVersionResult> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }

    await assertCanContribute(network, input.authorId, this.memberships);

    let fileId = network.activeFileId;
    const firstPublish = fileId === null;
    if (fileId === null) {
      fileId = randomUUID();
    }

    let parentVersionId: string | null;
    if (input.parentVersionId !== undefined) {
      parentVersionId = input.parentVersionId;
    } else {
      const current = await this.versions.findCurrent(input.networkId);
      parentVersionId = current ? current.versionId : null;
    }

    const lamportTs = await this.clock.next(input.networkId);
    const version = createFileVersion({
      networkId: input.networkId,
      fileId,
      parentVersionId,
      infoHash: input.infoHash,
      magnet: input.magnet ?? null,
      filename: input.filename,
      size: input.size ?? null,
      lamportTs,
      authorId: input.authorId,
    });

    await this.versions.save(version);
    if (firstPublish) {
      await this.networks.setActiveFile(input.networkId, fileId);
    }

    let concurrent = false;
    if (parentVersionId !== null) {
      const siblings = await this.versions.listConcurrent(input.networkId, parentVersionId);
      concurrent = siblings.length > 1;
    }

    return {
      fileId,
      versionId: version.versionId,
      lamportTs,
      parentVersionId,
      concurrent,
    };
  }
}
