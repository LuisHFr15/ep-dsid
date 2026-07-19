export type PresenceStatus = "online" | "offline";

export interface PeerPresence {
  networkId: string;
  peerId: string;
  userId: string;
  username: string;
  status: PresenceStatus;
  lastSeenAt: string;
}

export function createPresence(
  networkId: string,
  peerId: string,
  userId: string,
  username: string,
  lastSeenAt: string,
): PeerPresence {
  return {
    networkId,
    peerId,
    userId,
    username,
    status: "online",
    lastSeenAt,
  };
}
