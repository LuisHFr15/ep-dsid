import { Network } from "../../domain/network/network";
import { NetworkRepository } from "../../domain/network/network-repository";

export interface NetworkSummary {
  id: string;
  title: string;
  description: string;
  tags: string[];
  ownerId: string;
  accessMode: string;
  updateMode: string;
  activeFileId: string | null;
}

export interface NetworkFilter {
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
  constructor(private readonly networks: NetworkRepository) {}

  async execute(filter: NetworkFilter = {}): Promise<NetworkSummary[]> {
    const networks = await this.networks.listAll();
    return networks
      .filter((n) => matches(n, filter))
      .map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        tags: n.tags,
        ownerId: n.ownerId,
        accessMode: n.accessMode,
        updateMode: n.updateMode,
        activeFileId: n.activeFileId,
      }));
  }
}
