import { describe, it, expect } from "vitest";
import { CachingPeerPresenceStore } from "./caching-peer-presence-store";
import { PeerPresence } from "../../domain/peer/peer-presence";
import { PeerPresenceStore } from "../../domain/peer/peer-presence-store";

class RecordingDelegate implements PeerPresenceStore {
  readonly saves: PeerPresence[] = [];
  failNext = false;

  async save(presence: PeerPresence): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("delegate down");
    }
    this.saves.push({ ...presence });
  }

  async listByNetwork(networkId: string): Promise<PeerPresence[]> {
    return this.saves.filter((p) => p.networkId === networkId);
  }
}

function presence(peerId: string, networkId = "n1"): PeerPresence {
  return { networkId, peerId, userId: `u-${peerId}`, status: "online", lastSeenAt: "2026-01-01T00:00:00.000Z" };
}

describe("CachingPeerPresenceStore", () => {
  it("does not touch the delegate on save (hot path)", async () => {
    const delegate = new RecordingDelegate();
    const cache = new CachingPeerPresenceStore(delegate);
    await cache.save(presence("p1"));
    expect(delegate.saves).toHaveLength(0);
  });

  it("reflects saves immediately in listByNetwork", async () => {
    const delegate = new RecordingDelegate();
    const cache = new CachingPeerPresenceStore(delegate);
    await cache.save(presence("p1"));
    await cache.save(presence("p2"));
    const peers = await cache.listByNetwork("n1");
    expect(peers.map((p) => p.peerId).sort()).toEqual(["p1", "p2"]);
  });

  it("drains dirty entries on flush", async () => {
    const delegate = new RecordingDelegate();
    const cache = new CachingPeerPresenceStore(delegate);
    await cache.save(presence("p1"));
    await cache.save(presence("p2"));
    const n = await cache.flush();
    expect(n).toBe(2);
    expect(delegate.saves.map((p) => p.peerId).sort()).toEqual(["p1", "p2"]);
  });

  it("does not re-drain on a second flush with no new writes", async () => {
    const delegate = new RecordingDelegate();
    const cache = new CachingPeerPresenceStore(delegate);
    await cache.save(presence("p1"));
    await cache.flush();
    const n = await cache.flush();
    expect(n).toBe(0);
    expect(delegate.saves).toHaveLength(1);
  });

  it("only drains entries written since the last flush", async () => {
    const delegate = new RecordingDelegate();
    const cache = new CachingPeerPresenceStore(delegate);
    await cache.save(presence("p1"));
    await cache.flush();
    await cache.save(presence("p2"));
    await cache.flush();
    expect(delegate.saves.map((p) => p.peerId)).toEqual(["p1", "p2"]);
  });

  it("keeps an entry dirty when the delegate throws, draining it once recovered", async () => {
    const delegate = new RecordingDelegate();
    const cache = new CachingPeerPresenceStore(delegate);
    await cache.save(presence("p1"));
    delegate.failNext = true;
    const first = await cache.flush();
    expect(first).toBe(0);
    expect(delegate.saves).toHaveLength(0);

    const second = await cache.flush();
    expect(second).toBe(1);
    expect(delegate.saves.map((p) => p.peerId)).toEqual(["p1"]);
  });
});
