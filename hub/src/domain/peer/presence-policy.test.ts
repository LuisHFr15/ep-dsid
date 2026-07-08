import { describe, it, expect } from "vitest";
import { partitionPresence, PEER_TIMEOUT_MS } from "./presence-policy";
import { PeerPresence } from "./peer-presence";

function presence(peerId: string, lastSeenMs: number, status: "online" | "offline" = "online"): PeerPresence {
  return {
    networkId: "n1",
    peerId,
    userId: "u1",
    status,
    lastSeenAt: new Date(lastSeenMs).toISOString(),
  };
}

describe("partitionPresence", () => {
  const now = 1_000_000;

  it("keeps a peer seen within the timeout active", () => {
    const { active, expired } = partitionPresence([presence("p1", now - 10_000)], now);
    expect(active).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });

  it("expires a peer seen beyond the timeout", () => {
    const { active, expired } = partitionPresence([presence("p1", now - (PEER_TIMEOUT_MS + 1_000))], now);
    expect(active).toHaveLength(0);
    expect(expired.map((p) => p.peerId)).toEqual(["p1"]);
  });

  it("ignores peers already offline", () => {
    const { active, expired } = partitionPresence([presence("p1", now, "offline")], now);
    expect(active).toHaveLength(0);
    expect(expired).toHaveLength(0);
  });
});
