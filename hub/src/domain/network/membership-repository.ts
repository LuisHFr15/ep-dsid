import { Membership, MembershipStatus } from "./membership";

export interface MembershipRepository {
  save(membership: Membership): Promise<void>;
  find(networkId: string, userId: string): Promise<Membership | null>;
  listPending(networkId: string): Promise<Membership[]>;
  updateStatus(
    networkId: string,
    userId: string,
    status: MembershipStatus,
    decidedAt: string,
  ): Promise<void>;
}
