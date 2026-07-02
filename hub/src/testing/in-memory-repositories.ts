import { LamportClock } from "../application/ports/lamport-clock";
import { FileVersion } from "../domain/file/file-version";
import { FileVersionRepository } from "../domain/file/file-version-repository";
import { Membership, MembershipStatus } from "../domain/network/membership";
import { MembershipRepository } from "../domain/network/membership-repository";
import { Network } from "../domain/network/network";
import { NetworkRepository } from "../domain/network/network-repository";

export class InMemoryNetworkRepository implements NetworkRepository {
  private readonly networks = new Map<string, Network>();

  async save(network: Network): Promise<void> {
    this.networks.set(network.id, { ...network });
  }

  async findById(id: string): Promise<Network | null> {
    const network = this.networks.get(id);
    return network ? { ...network } : null;
  }

  async listAll(): Promise<Network[]> {
    return [...this.networks.values()].map((n) => ({ ...n }));
  }

  async setActiveFile(networkId: string, fileId: string): Promise<void> {
    const network = this.networks.get(networkId);
    if (network) {
      network.activeFileId = fileId;
    }
  }
}

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly memberships = new Map<string, Membership>();

  private key(networkId: string, userId: string): string {
    return `${networkId}#${userId}`;
  }

  async save(membership: Membership): Promise<void> {
    this.memberships.set(this.key(membership.networkId, membership.userId), { ...membership });
  }

  async find(networkId: string, userId: string): Promise<Membership | null> {
    const membership = this.memberships.get(this.key(networkId, userId));
    return membership ? { ...membership } : null;
  }

  async listPending(networkId: string): Promise<Membership[]> {
    return [...this.memberships.values()]
      .filter((m) => m.networkId === networkId && m.status === "pending")
      .map((m) => ({ ...m }));
  }

  async updateStatus(
    networkId: string,
    userId: string,
    status: MembershipStatus,
    decidedAt: string,
  ): Promise<void> {
    const membership = this.memberships.get(this.key(networkId, userId));
    if (membership) {
      membership.status = status;
      membership.decidedAt = decidedAt;
    }
  }
}

export class InMemoryFileVersionRepository implements FileVersionRepository {
  private readonly versions: FileVersion[] = [];

  async save(version: FileVersion): Promise<void> {
    this.versions.push({ ...version });
  }

  async findCurrent(networkId: string): Promise<FileVersion | null> {
    const forNetwork = this.versions.filter((v) => v.networkId === networkId);
    if (forNetwork.length === 0) {
      return null;
    }
    return forNetwork.reduce((a, b) => (a.lamportTs >= b.lamportTs ? a : b));
  }

  async findByVersionId(networkId: string, versionId: string): Promise<FileVersion | null> {
    return (
      this.versions.find((v) => v.networkId === networkId && v.versionId === versionId) ?? null
    );
  }

  async listConcurrent(networkId: string, parentVersionId: string): Promise<FileVersion[]> {
    return this.versions.filter(
      (v) => v.networkId === networkId && v.parentVersionId === parentVersionId,
    );
  }

  async listVersions(networkId: string): Promise<FileVersion[]> {
    return this.versions.filter((v) => v.networkId === networkId).map((v) => ({ ...v }));
  }
}

export class FakeLamportClock implements LamportClock {
  private readonly counters = new Map<string, number>();

  async next(networkId: string): Promise<number> {
    const value = (this.counters.get(networkId) ?? 0) + 1;
    this.counters.set(networkId, value);
    return value;
  }
}
