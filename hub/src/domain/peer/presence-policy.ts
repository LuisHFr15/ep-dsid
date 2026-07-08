import { PeerPresence } from "./peer-presence";

export const PEER_TIMEOUT_MS = 30_000;
export const FALLBACK_THRESHOLD = 4;

export interface PresencePartition {
  active: PeerPresence[];
  expired: PeerPresence[];
}

export function partitionPresence(peers: PeerPresence[], nowMs: number): PresencePartition {
  const active: PeerPresence[] = [];
  const expired: PeerPresence[] = [];

  for (const peer of peers) {
    if (peer.status !== "online") {
      continue;
    }
    const age = nowMs - new Date(peer.lastSeenAt).getTime();
    if (age > PEER_TIMEOUT_MS) {
      expired.push(peer);
    } else {
      active.push(peer);
    }
  }

  return { active, expired };
}
