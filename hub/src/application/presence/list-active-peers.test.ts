import { describe, it, expect } from "vitest";
import { ListActivePeers } from "./list-active-peers";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createMembership } from "../../domain/network/membership";
import { AccessMode, createNetwork } from "../../domain/network/network";
import { createPresence } from "../../domain/peer/peer-presence";
import { InMemoryPeerPresenceStore } from "../../infrastructure/memory/in-memory-peer-presence-store";
import {
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

async function setup(accessMode: AccessMode = "public") {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const presence = new InMemoryPeerPresenceStore();
  const network = createNetwork({
    title: "docs",
    description: "",
    ownerId: "alice",
    accessMode,
    updateMode: "collaborative",
  });
  await networks.save(network);
  await memberships.save(createMembership(network.id, "alice", "alice", "approved"));
  const time = { value: 1_000_000 };
  const listPeers = new ListActivePeers(networks, memberships, presence, () => time.value);
  return { networks, memberships, presence, network, time, listPeers };
}

async function beat(presence: InMemoryPeerPresenceStore, networkId: string, peerId: string, atMs: number) {
  await presence.save(
    createPresence(networkId, peerId, `user-${peerId}`, `nick-${peerId}`, new Date(atMs).toISOString()),
  );
}

describe("ListActivePeers", () => {
  it("returns peers seen within the window for an authorized reader", async () => {
    const { listPeers, presence, network, time } = await setup();
    await beat(presence, network.id, "peer-1", time.value);
    await beat(presence, network.id, "peer-2", time.value);

    const result = await listPeers.execute({ networkId: network.id, requesterId: "alice" });
    expect(result.activePeers.map((p) => p.username).sort()).toEqual(["nick-peer-1", "nick-peer-2"]);
    expect(result.activePeers[0]).toHaveProperty("lastSeenAt");
  });

  it("omits peers that have expired", async () => {
    const { listPeers, presence, network, time } = await setup();
    await beat(presence, network.id, "stale", time.value);
    time.value += 31_000;
    await beat(presence, network.id, "fresh", time.value);

    const result = await listPeers.execute({ networkId: network.id, requesterId: "alice" });
    expect(result.activePeers.map((p) => p.username)).toEqual(["nick-fresh"]);
  });

  it("exposes the nickname but not internal identifiers", async () => {
    const { listPeers, presence, network, time } = await setup();
    await beat(presence, network.id, "peer-1", time.value);
    const result = await listPeers.execute({ networkId: network.id, requesterId: "alice" });
    expect(result.activePeers[0]).toHaveProperty("username", "nick-peer-1");
    expect(result.activePeers[0]).not.toHaveProperty("userId");
    expect(result.activePeers[0]).not.toHaveProperty("peerId");
  });

  it("forbids a non-member on a private network", async () => {
    const { listPeers, network } = await setup("private");
    await expect(
      listPeers.execute({ networkId: network.id, requesterId: "bob" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("fails for an unknown network", async () => {
    const { listPeers } = await setup();
    await expect(
      listPeers.execute({ networkId: "nope", requesterId: "alice" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
