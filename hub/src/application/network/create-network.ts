import { createMembership } from "../../domain/network/membership";
import { MembershipRepository } from "../../domain/network/membership-repository";
import {
  AccessMode,
  createNetwork,
  Network,
  UpdateMode,
} from "../../domain/network/network";
import { NetworkRepository } from "../../domain/network/network-repository";

export interface CreateNetworkInput {
  ownerId: string;
  title: string;
  description: string;
  tags?: string[];
  accessMode: AccessMode;
  updateMode: UpdateMode;
}

export class CreateNetwork {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(input: CreateNetworkInput): Promise<Network> {
    const network = createNetwork({
      title: input.title,
      description: input.description,
      tags: input.tags,
      ownerId: input.ownerId,
      accessMode: input.accessMode,
      updateMode: input.updateMode,
    });

    await this.networks.save(network);
    await this.memberships.save(createMembership(network.id, input.ownerId, "approved"));

    return network;
  }
}
