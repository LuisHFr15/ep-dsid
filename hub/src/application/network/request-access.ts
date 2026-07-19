import { NotFoundError } from "../../domain/errors/domain-error";
import { createMembership, MembershipStatus } from "../../domain/network/membership";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";

export interface RequestAccessInput {
  networkId: string;
  userId: string;
  username: string;
}

export interface RequestAccessResult {
  status: MembershipStatus;
}

export class RequestAccess {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(input: RequestAccessInput): Promise<RequestAccessResult> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }

    if (network.ownerId === input.userId) {
      return { status: "approved" };
    }

    const existing = await this.memberships.find(input.networkId, input.userId);
    if (existing) {
      return { status: existing.status };
    }

    const status: MembershipStatus = network.accessMode === "public" ? "approved" : "pending";
    await this.memberships.save(
      createMembership(input.networkId, input.userId, input.username, status),
    );

    return { status };
  }
}
