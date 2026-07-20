import { describe, it, expect } from "vitest";
import { PublishVersion } from "./publish-version";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createMembership } from "../../domain/network/membership";
import { AccessMode, createNetwork, UpdateMode } from "../../domain/network/network";
import {
  FakeLamportClock,
  InMemoryFileVersionRepository,
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

async function setup(updateMode: UpdateMode = "collaborative", accessMode: AccessMode = "private") {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const versions = new InMemoryFileVersionRepository();
  const clock = new FakeLamportClock();
  const network = createNetwork({
    title: "docs",
    description: "",
    ownerId: "alice",
    accessMode,
    updateMode,
  });
  await networks.save(network);
  await memberships.save(createMembership(network.id, "alice", "alice", "approved"));
  const publish = new PublishVersion(networks, memberships, versions, clock);
  return { networks, memberships, versions, network, publish };
}

describe("PublishVersion", () => {
  it("creates the file on first publish with parent null and lamport 1", async () => {
    const { publish, networks, network } = await setup();
    const result = await publish.execute({
      networkId: network.id,
      authorId: "alice",
      infoHash: "h1",
      filename: "a.txt",
    });

    expect(result.parentVersionId).toBeNull();
    expect(result.lamportTs).toBe(1);
    expect(result.fileId).toBeTruthy();
    const stored = await networks.findById(network.id);
    expect(stored?.activeFileId).toBe(result.fileId);
  });

  it("increments lamport and defaults parent to the current version on sequential publishes", async () => {
    const { publish, network } = await setup();
    const v1 = await publish.execute({
      networkId: network.id,
      authorId: "alice",
      infoHash: "h1",
      filename: "a.txt",
    });
    const v2 = await publish.execute({
      networkId: network.id,
      authorId: "alice",
      infoHash: "h2",
      filename: "a.txt",
    });

    expect(v2.lamportTs).toBe(2);
    expect(v2.parentVersionId).toBe(v1.versionId);
    expect(v2.fileId).toBe(v1.fileId);
  });

  it("keeps both versions that share a parent and flags them concurrent", async () => {
    const { publish, versions, network } = await setup();
    const base = await publish.execute({
      networkId: network.id,
      authorId: "alice",
      infoHash: "h1",
      filename: "a.txt",
    });

    const branchA = await publish.execute({
      networkId: network.id,
      authorId: "alice",
      infoHash: "h2a",
      filename: "a.txt",
      parentVersionId: base.versionId,
    });
    const branchB = await publish.execute({
      networkId: network.id,
      authorId: "alice",
      infoHash: "h2b",
      filename: "a.txt",
      parentVersionId: base.versionId,
    });

    expect(branchB.concurrent).toBe(true);
    const siblings = await versions.listConcurrent(network.id, base.versionId);
    expect(siblings.map((v) => v.versionId).sort()).toEqual(
      [branchA.versionId, branchB.versionId].sort(),
    );
  });

  it("resolves the current version by max lamport (LWW)", async () => {
    const { publish, versions, network } = await setup();
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    const v2 = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h2", filename: "a" });

    const current = await versions.findCurrent(network.id);
    expect(current?.versionId).toBe(v2.versionId);
    expect(current?.lamportTs).toBe(2);
  });

  it("blocks a non-owner in centralized mode", async () => {
    const { publish, memberships, network } = await setup("centralized");
    await memberships.save(createMembership(network.id, "bob", "bob", "approved"));
    await expect(
      publish.execute({ networkId: network.id, authorId: "bob", infoHash: "h", filename: "a" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows an approved member in collaborative mode", async () => {
    const { publish, memberships, network } = await setup("collaborative");
    await memberships.save(createMembership(network.id, "bob", "bob", "approved"));
    const result = await publish.execute({
      networkId: network.id,
      authorId: "bob",
      infoHash: "h",
      filename: "a",
    });
    expect(result.versionId).toBeTruthy();
  });

  it("blocks a non-member", async () => {
    const { publish, network } = await setup("collaborative");
    await expect(
      publish.execute({ networkId: network.id, authorId: "carol", infoHash: "h", filename: "a" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows any authenticated user to publish in a public network", async () => {
    const { publish, network } = await setup("collaborative", "public");
    const result = await publish.execute({
      networkId: network.id,
      authorId: "carol", // não é owner nem membro
      infoHash: "h",
      filename: "a",
    });
    expect(result.versionId).toBeTruthy();
  });

  it("fails for an unknown network", async () => {
    const { publish } = await setup();
    await expect(
      publish.execute({ networkId: "nope", authorId: "alice", infoHash: "h", filename: "a" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
