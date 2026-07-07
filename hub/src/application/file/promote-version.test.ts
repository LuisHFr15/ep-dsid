import { describe, it, expect } from "vitest";
import { PromoteVersion } from "./promote-version";
import { PublishVersion } from "./publish-version";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createMembership } from "../../domain/network/membership";
import { createNetwork, UpdateMode } from "../../domain/network/network";
import {
  FakeLamportClock,
  InMemoryFileVersionRepository,
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

async function setup(updateMode: UpdateMode = "collaborative") {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const versions = new InMemoryFileVersionRepository();
  const clock = new FakeLamportClock();
  const network = createNetwork({
    title: "docs",
    description: "",
    ownerId: "alice",
    accessMode: "private",
    updateMode,
  });
  await networks.save(network);
  await memberships.save(createMembership(network.id, "alice", "approved"));
  const publish = new PublishVersion(networks, memberships, versions, clock);
  const promote = new PromoteVersion(networks, memberships, versions, clock);
  return { networks, memberships, versions, network, publish, promote };
}

async function fork(setupResult: Awaited<ReturnType<typeof setup>>) {
  const { publish, network } = setupResult;
  const base = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
  const branchA = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h2a", filename: "a", parentVersionId: base.versionId });
  const branchB = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h2b", filename: "a", parentVersionId: base.versionId });
  return { base, branchA, branchB };
}

describe("PromoteVersion", () => {
  it("makes the promoted branch current via a new resolution version", async () => {
    const s = await setup();
    const { branchA, branchB } = await fork(s);
    // branchB is current (higher lamport). Promote the losing branchA.
    const result = await s.promote.execute({
      networkId: s.network.id,
      versionId: branchA.versionId,
      actorId: "alice",
    });

    expect(result.parentVersionId).toBe(branchA.versionId);
    const current = await s.versions.findCurrent(s.network.id);
    expect(current?.versionId).toBe(result.versionId);
    expect(current?.infoHash).toBe("h2a");
    expect(result.lamportTs).toBeGreaterThan(branchB.lamportTs);
  });

  it("preserves both original branches after promotion", async () => {
    const s = await setup();
    const { branchA, branchB } = await fork(s);
    await s.promote.execute({ networkId: s.network.id, versionId: branchA.versionId, actorId: "alice" });

    const all = await s.versions.listVersions(s.network.id);
    const ids = all.map((v) => v.versionId);
    expect(ids).toContain(branchA.versionId);
    expect(ids).toContain(branchB.versionId);
    expect(all).toHaveLength(4); // base + A + B + resolution
  });

  it("copies the promoted content into the resolution version", async () => {
    const s = await setup();
    const { branchA } = await fork(s);
    const result = await s.promote.execute({ networkId: s.network.id, versionId: branchA.versionId, actorId: "alice" });

    const resolution = await s.versions.findByVersionId(s.network.id, result.versionId);
    expect(resolution?.infoHash).toBe("h2a");
    expect(resolution?.filename).toBe("a");
    expect(resolution?.authorId).toBe("alice");
  });

  it("blocks a non-owner in centralized mode", async () => {
    const s = await setup("centralized");
    await s.memberships.save(createMembership(s.network.id, "bob", "approved"));
    const { branchA } = await fork(s);
    await expect(
      s.promote.execute({ networkId: s.network.id, versionId: branchA.versionId, actorId: "bob" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows an approved member in collaborative mode", async () => {
    const s = await setup("collaborative");
    await s.memberships.save(createMembership(s.network.id, "bob", "approved"));
    const { branchA } = await fork(s);
    const result = await s.promote.execute({ networkId: s.network.id, versionId: branchA.versionId, actorId: "bob" });
    expect(result.versionId).toBeTruthy();
  });

  it("fails for an unknown version", async () => {
    const s = await setup();
    await fork(s);
    await expect(
      s.promote.execute({ networkId: s.network.id, versionId: "ghost", actorId: "alice" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("fails for an unknown network", async () => {
    const s = await setup();
    await expect(
      s.promote.execute({ networkId: "nope", versionId: "x", actorId: "alice" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
