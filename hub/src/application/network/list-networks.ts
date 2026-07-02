import { NetworkRepository } from "../../domain/network/network-repository";

export interface NetworkSummary {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  accessMode: string;
  updateMode: string;
  activeFileId: string | null;
}

export class ListNetworks {
  constructor(private readonly networks: NetworkRepository) {}

  async execute(): Promise<NetworkSummary[]> {
    const networks = await this.networks.listAll();
    return networks.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      ownerId: n.ownerId,
      accessMode: n.accessMode,
      updateMode: n.updateMode,
      activeFileId: n.activeFileId,
    }));
  }
}
