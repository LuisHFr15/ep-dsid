import { describe, it, expect } from "vitest";
import { GetCurrentFile } from "./get-current-file";
import { PublishVersion } from "./publish-version";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createMembership } from "../../domain/network/membership";
import { AccessMode, createNetwork } from "../../domain/network/network";
import {
  FakeLamportClock,
  InMemoryFileVersionRepository,
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

async function setup(accessMode: AccessMode = "private") {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const versions = new InMemoryFileVersionRepository();
  const clock = new FakeLamportClock();
  const network = createNetwork({
    title: "docs",
    description: "",
    ownerId: "alice",
    accessMode,
    updateMode: "collaborative",
  });
  await networks.save(network);
  await memberships.save(createMembership(network.id, "alice", "alice", "approved"));
  const publish = new PublishVersion(networks, memberships, versions, clock);
  const getCurrent = new GetCurrentFile(networks, memberships, versions);
  return { networks, memberships, versions, network, publish, getCurrent };
}

describe("GetCurrentFile", () => {
  it("returns the current version for the owner", async () => {
    const { publish, getCurrent, network } = await setup();
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    const v2 = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h2", filename: "a" });

    const resolved = await getCurrent.execute({ networkId: network.id, requesterId: "alice" });
    expect(resolved.versionId).toBe(v2.versionId);
    expect(resolved.infoHash).toBe("h2");
  });

  it("forbids a non-member on a private network", async () => {
    const { publish, getCurrent, network } = await setup("private");
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    await expect(
      getCurrent.execute({ networkId: network.id, requesterId: "bob" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows an approved member on a private network", async () => {
    const { publish, getCurrent, memberships, network } = await setup("private");
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    await memberships.save(createMembership(network.id, "bob", "bob", "approved"));
    const resolved = await getCurrent.execute({ networkId: network.id, requesterId: "bob" });
    expect(resolved.infoHash).toBe("h1");
  });

  it("allows any authenticated user on a public network without membership", async () => {
    const { publish, getCurrent, network } = await setup("public");
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    const resolved = await getCurrent.execute({ networkId: network.id, requesterId: "stranger" });
    expect(resolved.infoHash).toBe("h1");
  });

  it("resolves a specific version by id", async () => {
    const { publish, getCurrent, network } = await setup();
    const v1 = await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h1", filename: "a" });
    await publish.execute({ networkId: network.id, authorId: "alice", infoHash: "h2", filename: "a" });

    const resolved = await getCurrent.execute({
      networkId: network.id,
      requesterId: "alice",
      versionId: v1.versionId,
    });
    expect(resolved.versionId).toBe(v1.versionId);
    expect(resolved.infoHash).toBe("h1");
  });

  it("returns NotFound when the network has no file yet", async () => {
    const { getCurrent, network } = await setup();
    await expect(
      getCurrent.execute({ networkId: network.id, requesterId: "alice" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
