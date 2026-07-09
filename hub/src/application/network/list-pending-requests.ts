import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";

export interface ListPendingRequestsInput {
  networkId: string;
  requesterId: string;
}

export interface PendingRequest {
  userId: string;
  requestedAt: string;
}

export class ListPendingRequests {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(input: ListPendingRequestsInput): Promise<PendingRequest[]> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }
    if (network.ownerId !== input.requesterId) {
      throw new ForbiddenError("only the owner can list pending requests");
    }

    const pending = await this.memberships.listPending(input.networkId);
    return pending.map((m) => ({ userId: m.userId, requestedAt: m.requestedAt }));
  }
}
