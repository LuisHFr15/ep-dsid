import { NotFoundError } from "../../domain/errors/domain-error";
import { FileVersionRepository } from "../../domain/file/file-version-repository";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";
import { assertCanRead } from "../network/access-guards";

export interface GetCurrentFileInput {
  networkId: string;
  requesterId: string;
  versionId?: string;
}

export interface ResolvedFile {
  fileId: string;
  versionId: string;
  parentVersionId: string | null;
  infoHash: string;
  magnet: string | null;
  filename: string;
  size: number | null;
  lamportTs: number;
}

export class GetCurrentFile {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
    private readonly versions: FileVersionRepository,
  ) {}

  async execute(input: GetCurrentFileInput): Promise<ResolvedFile> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }

    await assertCanRead(network, input.requesterId, this.memberships);

    const version = input.versionId
      ? await this.versions.findByVersionId(input.networkId, input.versionId)
      : await this.versions.findCurrent(input.networkId);

    if (!version) {
      throw new NotFoundError("file not found");
    }

    return {
      fileId: version.fileId,
      versionId: version.versionId,
      parentVersionId: version.parentVersionId,
      infoHash: version.infoHash,
      magnet: version.magnet,
      filename: version.filename,
      size: version.size,
      lamportTs: version.lamportTs,
    };
  }
}
