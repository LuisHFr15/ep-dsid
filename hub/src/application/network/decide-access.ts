import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { MembershipStatus } from "../../domain/network/membership";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";

export type AccessDecision = "approve" | "reject";

export interface DecideAccessInput {
  networkId: string;
  ownerId: string;
  userId: string;
  decision: AccessDecision;
}

export interface DecideAccessResult {
  userId: string;
  status: MembershipStatus;
}

export class DecideAccess {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(input: DecideAccessInput): Promise<DecideAccessResult> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }
    if (network.ownerId !== input.ownerId) {
      throw new ForbiddenError("only the owner can decide access");
    }

    const membership = await this.memberships.find(input.networkId, input.userId);
    if (!membership) {
      throw new NotFoundError("access request not found");
    }

    const status: MembershipStatus = input.decision === "approve" ? "approved" : "rejected";
    await this.memberships.updateStatus(
      input.networkId,
      input.userId,
      status,
      new Date().toISOString(),
    );

    return { userId: input.userId, status };
  }
}
