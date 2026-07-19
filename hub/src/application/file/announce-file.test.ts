import { describe, it, expect } from "vitest";
import { AnnounceFile } from "./announce-file";
import { GetCurrentFile } from "./get-current-file";
import { ListVersions } from "./list-versions";
import { PublishVersion } from "./publish-version";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createMembership } from "../../domain/network/membership";
import { createNetwork } from "../../domain/network/network";
import {
  FakeLamportClock,
  InMemoryFileVersionRepository,
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

async function setup() {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const versions = new InMemoryFileVersionRepository();
  const clock = new FakeLamportClock();
  const network = createNetwork({
    title: "docs",
    description: "",
    ownerId: "alice",
    accessMode: "private",
    updateMode: "collaborative",
  });
  await networks.save(network);
  await memberships.save(createMembership(network.id, "alice", "alice", "approved"));
  const announce = new AnnounceFile(networks, versions, clock);
  const publish = new PublishVersion(networks, memberships, versions, clock);
  const getCurrent = new GetCurrentFile(networks, memberships, versions);
  const listVersions = new ListVersions(networks, memberships, versions);
  return { networks, memberships, versions, network, announce, publish, getCurrent, listVersions };
}

describe("AnnounceFile", () => {
  it("creates a new root file and marks it active", async () => {
    const s = await setup();
    const result = await s.announce.execute({
      networkId: s.network.id,
      ownerId: "alice",
      infoHash: "h1",
      filename: "a.txt",
    });

    expect(result.fileId).toBeTruthy();
    expect(result.lamportTs).toBe(1);
    const stored = await s.networks.findById(s.network.id);
    expect(stored?.activeFileId).toBe(result.fileId);

    const version = await s.versions.findByVersionId(s.network.id, result.versionId);
    expect(version?.parentVersionId).toBeNull();
  });

  it("replaces the active file, deprecating the previous one", async () => {
    const s = await setup();
    const first = await s.announce.execute({ networkId: s.network.id, ownerId: "alice", infoHash: "h1", filename: "a.txt" });
    const firstVersionId = first.versionId;

    const second = await s.announce.execute({ networkId: s.network.id, ownerId: "alice", infoHash: "h2", filename: "b.txt" });

    // current now resolves the new file
    const current = await s.getCurrent.execute({ networkId: s.network.id, requesterId: "alice" });
    expect(current.fileId).toBe(second.fileId);
    expect(current.infoHash).toBe("h2");

    // the deprecated version is still fetchable by id (immutability)
    const old = await s.getCurrent.execute({ networkId: s.network.id, requesterId: "alice", versionId: firstVersionId });
    expect(old.infoHash).toBe("h1");

    // but the DAG only shows the active file
    const dag = await s.listVersions.execute({ networkId: s.network.id, requesterId: "alice" });
    expect(dag.fileId).toBe(second.fileId);
    expect(dag.versions.map((v) => v.versionId)).toEqual([second.versionId]);
  });

  it("keeps publishing versions on the newly announced file", async () => {
    const s = await setup();
    await s.announce.execute({ networkId: s.network.id, ownerId: "alice", infoHash: "h1", filename: "a" });
    const announced = await s.announce.execute({ networkId: s.network.id, ownerId: "alice", infoHash: "h2", filename: "b" });

    const v = await s.publish.execute({ networkId: s.network.id, authorId: "alice", infoHash: "h3", filename: "b" });
    expect(v.fileId).toBe(announced.fileId);
    expect(v.parentVersionId).toBe(announced.versionId);
  });

  it("forbids a non-owner from announcing", async () => {
    const s = await setup();
    await s.memberships.save(createMembership(s.network.id, "bob", "bob", "approved"));
    await expect(
      s.announce.execute({ networkId: s.network.id, ownerId: "bob", infoHash: "h", filename: "a" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("fails for an unknown network", async () => {
    const s = await setup();
    await expect(
      s.announce.execute({ networkId: "nope", ownerId: "alice", infoHash: "h", filename: "a" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
