import { MembershipRepository } from "../../domain/network/membership-repository";
import { Network } from "../../domain/network/network";
import { NetworkRepository } from "../../domain/network/network-repository";

export type NetworkMembershipStatus =
  | "owner"
  | "approved"
  | "pending"
  | "rejected"
  | "none";

export interface NetworkSummary {
  id: string;
  title: string;
  description: string;
  tags: string[];
  ownerId: string;
  accessMode: string;
  updateMode: string;
  activeFileId: string | null;
  // Relação do usuário que fez a requisição com esta rede — deixa o cliente
  // esconder "pedir acesso" para quem já é membro/owner.
  membershipStatus: NetworkMembershipStatus;
}

export interface NetworkFilter {
  requesterId: string;
  q?: string;
  tag?: string;
}

function matches(network: Network, filter: NetworkFilter): boolean {
  if (filter.tag && !network.tags.includes(filter.tag)) {
    return false;
  }
  if (filter.q) {
    const q = filter.q.toLowerCase();
    const haystack = [network.title, network.description, ...network.tags]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) {
      return false;
    }
  }
  return true;
}

export class ListNetworks {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(filter: NetworkFilter): Promise<NetworkSummary[]> {
    const networks = await this.networks.listAll();
    const visible = networks.filter((n) => matches(n, filter));

    // Resolve o status de membership do requester por rede. N lookups (um por
    // rede) — aceitável no escopo atual; otimizar em lote se o catálogo crescer.
    return Promise.all(
      visible.map(async (n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        tags: n.tags,
        ownerId: n.ownerId,
        accessMode: n.accessMode,
        updateMode: n.updateMode,
        activeFileId: n.activeFileId,
        membershipStatus: await this.resolveMembershipStatus(n, filter.requesterId),
      })),
    );
  }

  private async resolveMembershipStatus(
    network: Network,
    requesterId: string,
  ): Promise<NetworkMembershipStatus> {
    if (network.ownerId === requesterId) {
      return "owner";
    }
    const membership = await this.memberships.find(network.id, requesterId);
    return membership?.status ?? "none";
  }
}
