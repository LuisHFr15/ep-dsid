export type MembershipStatus = "pending" | "approved" | "rejected";

export interface Membership {
  networkId: string;
  userId: string;
  username: string;
  status: MembershipStatus;
  requestedAt: string;
  decidedAt: string | null;
}

export function createMembership(
  networkId: string,
  userId: string,
  username: string,
  status: MembershipStatus,
): Membership {
  const now = new Date().toISOString();
  return {
    networkId,
    userId,
    username,
    status,
    requestedAt: now,
    decidedAt: status === "pending" ? null : now,
  };
}
