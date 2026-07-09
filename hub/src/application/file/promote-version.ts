import { NotFoundError } from "../../domain/errors/domain-error";
import { createFileVersion } from "../../domain/file/file-version";
import { FileVersionRepository } from "../../domain/file/file-version-repository";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";
import { LamportClock } from "../ports/lamport-clock";
import { assertCanContribute } from "../network/access-guards";

export interface PromoteVersionInput {
  networkId: string;
  versionId: string;
  actorId: string;
}

export interface PromoteVersionResult {
  fileId: string;
  versionId: string;
  lamportTs: number;
  parentVersionId: string;
}

export class PromoteVersion {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
    private readonly versions: FileVersionRepository,
    private readonly clock: LamportClock,
  ) {}

  async execute(input: PromoteVersionInput): Promise<PromoteVersionResult> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }

    await assertCanContribute(network, input.actorId, this.memberships);

    const promoted = await this.versions.findByVersionId(input.networkId, input.versionId);
    if (!promoted || promoted.fileId !== network.activeFileId) {
      throw new NotFoundError("version not found");
    }

    const lamportTs = await this.clock.next(input.networkId);
    const resolution = createFileVersion({
      networkId: promoted.networkId,
      fileId: promoted.fileId,
      parentVersionId: promoted.versionId,
      infoHash: promoted.infoHash,
      magnet: promoted.magnet,
      filename: promoted.filename,
      size: promoted.size,
      lamportTs,
      authorId: input.actorId,
    });

    await this.versions.save(resolution);

    return {
      fileId: resolution.fileId,
      versionId: resolution.versionId,
      lamportTs,
      parentVersionId: resolution.parentVersionId as string,
    };
  }
}
