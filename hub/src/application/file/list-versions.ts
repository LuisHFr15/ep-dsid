import { NotFoundError } from "../../domain/errors/domain-error";
import { FileVersionRepository } from "../../domain/file/file-version-repository";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";
import { assertCanRead } from "../network/access-guards";

export interface ListVersionsInput {
  networkId: string;
  requesterId: string;
}

export interface VersionNode {
  versionId: string;
  parentVersionId: string | null;
  infoHash: string;
  filename: string;
  lamportTs: number;
  authorId: string;
  createdAt: string;
  isCurrent: boolean;
  concurrent: boolean;
}

export interface VersionDag {
  fileId: string | null;
  currentVersionId: string | null;
  versions: VersionNode[];
}

export class ListVersions {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
    private readonly versions: FileVersionRepository,
  ) {}

  async execute(input: ListVersionsInput): Promise<VersionDag> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }

    await assertCanRead(network, input.requesterId, this.memberships);

    const all = await this.versions.listVersions(input.networkId);
    const versions = all.filter((v) => v.fileId === network.activeFileId);
    if (versions.length === 0) {
      return { fileId: network.activeFileId, currentVersionId: null, versions: [] };
    }

    const current = versions.reduce((a, b) => (a.lamportTs >= b.lamportTs ? a : b));

    const parentCounts = new Map<string, number>();
    for (const v of versions) {
      if (v.parentVersionId !== null) {
        parentCounts.set(v.parentVersionId, (parentCounts.get(v.parentVersionId) ?? 0) + 1);
      }
    }

    const nodes: VersionNode[] = versions
      .sort((a, b) => a.lamportTs - b.lamportTs)
      .map((v) => ({
        versionId: v.versionId,
        parentVersionId: v.parentVersionId,
        infoHash: v.infoHash,
        filename: v.filename,
        lamportTs: v.lamportTs,
        authorId: v.authorId,
        createdAt: v.createdAt,
        isCurrent: v.versionId === current.versionId,
        concurrent:
          v.parentVersionId !== null && (parentCounts.get(v.parentVersionId) ?? 0) > 1,
      }));

    return { fileId: network.activeFileId, currentVersionId: current.versionId, versions: nodes };
  }
}
