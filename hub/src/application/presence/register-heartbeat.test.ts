import { describe, it, expect } from "vitest";
import { RegisterHeartbeat } from "./register-heartbeat";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createMembership } from "../../domain/network/membership";
import { AccessMode, createNetwork } from "../../domain/network/network";
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
  const clock = { value: 1_000_000 };
  const now = () => clock.value;
  const heartbeat = new RegisterHeartbeat(networks, memberships, presence, now);
  return { networks, memberships, presence, network, clock, heartbeat };
}

describe("RegisterHeartbeat", () => {
  it("registers presence and counts the peer as active", async () => {
    const { heartbeat, network } = await setup();
    const result = await heartbeat.execute({
      networkId: network.id,
      peerId: "peer-1",
      userId: "alice",
      username: "alice",
    });
    expect(result.activePeers).toBe(1);
  });

  it("marks a peer offline after 30s without a beat", async () => {
    const { heartbeat, network, clock } = await setup();
    await heartbeat.execute({ networkId: network.id, peerId: "peer-1", userId: "alice", username: "alice" });

    clock.value += 31_000;
    const result = await heartbeat.execute({
      networkId: network.id,
      peerId: "peer-2",
      userId: "alice",
      username: "alice",
    });

    expect(result.activePeers).toBe(1);
  });

  it("keeps a peer active when it beats within the window", async () => {
    const { heartbeat, network, clock } = await setup();
    await heartbeat.execute({ networkId: network.id, peerId: "peer-1", userId: "alice", username: "alice" });

    clock.value += 10_000;
    await heartbeat.execute({ networkId: network.id, peerId: "peer-1", userId: "alice", username: "alice" });
    const result = await heartbeat.execute({
      networkId: network.id,
      peerId: "peer-2",
      userId: "alice",
      username: "alice",
    });

    expect(result.activePeers).toBe(2);
  });

  it("clears the fallback flag once there are more than four active peers", async () => {
    const { heartbeat, network } = await setup();
    let result;
    for (const peerId of ["p1", "p2", "p3", "p4", "p5"]) {
      result = await heartbeat.execute({ networkId: network.id, peerId, userId: "alice", username: "alice" });
    }
    expect(result?.activePeers).toBe(5);
  });

  it("forbids a non-member on a private network", async () => {
    const { heartbeat, network } = await setup("private");
    await expect(
      heartbeat.execute({ networkId: network.id, peerId: "peer-x", userId: "bob", username: "bob" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("fails for an unknown network", async () => {
    const { heartbeat } = await setup();
    await expect(
      heartbeat.execute({ networkId: "nope", peerId: "peer-1", userId: "alice", username: "alice" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
