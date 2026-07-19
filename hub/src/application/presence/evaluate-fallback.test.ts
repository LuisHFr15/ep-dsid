import { describe, it, expect } from "vitest";
import { EvaluateFallback } from "./evaluate-fallback";
import { PublishVersion } from "../file/publish-version";
import { createMembership } from "../../domain/network/membership";
import { createNetwork } from "../../domain/network/network";
import { createPresence } from "../../domain/peer/peer-presence";
import {
  FakeLamportClock,
  InMemoryFileVersionRepository,
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";
import { InMemoryPeerPresenceStore } from "../../infrastructure/memory/in-memory-peer-presence-store";
import { FakeCommandQueue } from "../../testing/fake-command-queue";

async function setup() {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const versions = new InMemoryFileVersionRepository();
  const presence = new InMemoryPeerPresenceStore();
  const queue = new FakeCommandQueue();
  const clock = new FakeLamportClock();
  const network = createNetwork({
    title: "docs",
    description: "",
    ownerId: "alice",
    accessMode: "public",
    updateMode: "collaborative",
  });
  await networks.save(network);
  await memberships.save(createMembership(network.id, "alice", "alice", "approved"));
  const publish = new PublishVersion(networks, memberships, versions, clock);
  const time = { value: 1_000_000 };
  const evaluate = new EvaluateFallback(networks, versions, presence, queue, () => time.value);
  return { networks, memberships, versions, presence, queue, network, publish, time, evaluate };
}

async function beat(presence: InMemoryPeerPresenceStore, networkId: string, peerId: string, atMs: number) {
  await presence.save(
    createPresence(networkId, peerId, `user-${peerId}`, `nick-${peerId}`, new Date(atMs).toISOString()),
  );
}

describe("EvaluateFallback", () => {
  it("enqueues JOIN once for a small network with content", async () => {
    const s = await setup();
    await s.publish.execute({ networkId: s.network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    await beat(s.presence, s.network.id, "peer-1", s.time.value);

    await s.evaluate.evaluateAll();
    await s.evaluate.evaluateAll();

    expect(s.queue.sent).toHaveLength(1);
    expect(s.queue.sent[0]).toMatchObject({ cmd: "JOIN", networkId: s.network.id, infoHash: "h1" });
  });

  it("does not enqueue JOIN when there is no active file yet", async () => {
    const s = await setup();
    await beat(s.presence, s.network.id, "peer-1", s.time.value);

    await s.evaluate.evaluateAll();
    expect(s.queue.sent).toHaveLength(0);

    // once content exists, the next evaluation joins
    await s.publish.execute({ networkId: s.network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    await s.evaluate.evaluateAll();
    expect(s.queue.sent).toHaveLength(1);
    expect(s.queue.sent[0].cmd).toBe("JOIN");
  });

  it("does not enqueue LEAVE spuriously for a large network from the start", async () => {
    const s = await setup();
    await s.publish.execute({ networkId: s.network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    for (const p of ["p1", "p2", "p3", "p4", "p5"]) {
      await beat(s.presence, s.network.id, p, s.time.value);
    }

    await s.evaluate.evaluateAll();
    expect(s.queue.sent).toHaveLength(0);
  });

  it("enqueues LEAVE once when the network grows past the threshold", async () => {
    const s = await setup();
    await s.publish.execute({ networkId: s.network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    await beat(s.presence, s.network.id, "peer-1", s.time.value);
    await s.evaluate.evaluateAll(); // JOIN

    for (const p of ["p2", "p3", "p4", "p5"]) {
      await beat(s.presence, s.network.id, p, s.time.value);
    }
    await s.evaluate.evaluateAll(); // now 5 active -> LEAVE
    await s.evaluate.evaluateAll(); // no change

    const kinds = s.queue.sent.map((c) => c.cmd);
    expect(kinds).toEqual(["JOIN", "LEAVE"]);
    expect(s.queue.sent[1]).toMatchObject({ cmd: "LEAVE", networkId: s.network.id });
  });

  it("joins again after peers expire and drop back to the threshold", async () => {
    const s = await setup();
    await s.publish.execute({ networkId: s.network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    for (const p of ["p1", "p2", "p3", "p4", "p5"]) {
      await beat(s.presence, s.network.id, p, s.time.value);
    }
    await s.evaluate.evaluateAll(); // 5 active, was false -> stays false, no command

    // advance beyond the timeout without new beats -> all expire
    s.time.value += 31_000;
    await s.evaluate.evaluateAll(); // 0 active <= 4 -> JOIN

    expect(s.queue.sent.map((c) => c.cmd)).toEqual(["JOIN"]);
  });

  it("is a no-op when there are no networks", async () => {
    const networks = new InMemoryNetworkRepository();
    const versions = new InMemoryFileVersionRepository();
    const presence = new InMemoryPeerPresenceStore();
    const queue = new FakeCommandQueue();
    const evaluate = new EvaluateFallback(networks, versions, presence, queue, () => 1);
    await evaluate.evaluateAll();
    expect(queue.sent).toHaveLength(0);
  });
});
