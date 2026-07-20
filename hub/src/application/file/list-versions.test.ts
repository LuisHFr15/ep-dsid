import { describe, it, expect } from "vitest";
import { ListVersions } from "./list-versions";
import { PublishVersion } from "./publish-version";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createNetwork, UpdateMode } from "../../domain/network/network";
import { createMembership } from "../../domain/network/membership";
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
  await memberships.save(createMembership(network.id, "alice", "alice", "approved"));
  const publish = new PublishVersion(networks, memberships, versions, clock);
  const listVersions = new ListVersions(networks, memberships, versions);
  return { networks, memberships, versions, network, publish, listVersions };
}

describe("ListVersions", () => {
  it("returns an empty dag when the network has no file", async () => {
    const { listVersions, network } = await setup();
    const dag = await listVersions.execute({ networkId: network.id, requesterId: "alice" });
    expect(dag.versions).toEqual([]);
    expect(dag.currentVersionId).toBeNull();
  });

  it("lists a linear chain with the last version as current", async () => {
    const { listVersions, publish, network } = await setup();
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    const v2 = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h2", filename: "a" });

    const dag = await listVersions.execute({ networkId: network.id, requesterId: "alice" });
    expect(dag.versions).toHaveLength(2);
    expect(dag.currentVersionId).toBe(v2.versionId);
    expect(dag.versions.every((n) => n.concurrent)).toBe(false);
    expect(dag.versions.find((n) => n.versionId === v2.versionId)?.isCurrent).toBe(true);
  });

  it("includes the file size in each version node", async () => {
    const { listVersions, publish, network } = await setup();
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a", size: 2048 });

    const dag = await listVersions.execute({ networkId: network.id, requesterId: "alice" });
    expect(dag.versions[0].size).toBe(2048);
  });

  it("flags concurrent siblings that share a parent", async () => {
    const { listVersions, publish, network } = await setup();
    const base = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    const a = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h2a", filename: "a", parentVersionId: base.versionId });
    const b = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h2b", filename: "a", parentVersionId: base.versionId });

    const dag = await listVersions.execute({ networkId: network.id, requesterId: "alice" });
    const byId = new Map(dag.versions.map((n) => [n.versionId, n]));
    expect(byId.get(a.versionId)?.concurrent).toBe(true);
    expect(byId.get(b.versionId)?.concurrent).toBe(true);
    expect(byId.get(base.versionId)?.concurrent).toBe(false);
    expect(dag.currentVersionId).toBe(b.versionId);
  });

  it("forbids a non-member on a private network", async () => {
    const { listVersions, publish, network } = await setup();
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    await expect(
      listVersions.execute({ networkId: network.id, requesterId: "bob" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("fails for an unknown network", async () => {
    const { listVersions } = await setup();
    await expect(
      listVersions.execute({ networkId: "nope", requesterId: "alice" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
