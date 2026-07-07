export type PresenceStatus = "online" | "offline";

export interface PeerPresence {
  networkId: string;
  peerId: string;
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string;
}

export function createPresence(
  networkId: string,
  peerId: string,
  userId: string,
  lastSeenAt: string,
): PeerPresence {
  return {
    networkId,
    peerId,
    userId,
    status: "online",
    lastSeenAt,
  };
}
