import { describe, it, expect } from "vitest";
import { RequestAccess } from "./request-access";
import { NotFoundError } from "../../domain/errors/domain-error";
import { createNetwork } from "../../domain/network/network";
import {
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

async function setup(accessMode: "private" | "public") {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const network = createNetwork({
    title: "docs",
    description: "",
    ownerId: "alice",
    accessMode,
    updateMode: "centralized",
  });
  await networks.save(network);
  const requestAccess = new RequestAccess(networks, memberships);
  return { networks, memberships, network, requestAccess };
}

describe("RequestAccess", () => {
  it("throws NotFoundError for an unknown network", async () => {
    const { requestAccess } = await setup("private");
    await expect(
      requestAccess.execute({ networkId: "nope", userId: "bob" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("leaves a private request pending", async () => {
    const { requestAccess, network, memberships } = await setup("private");
    const result = await requestAccess.execute({ networkId: network.id, userId: "bob" });
    expect(result.status).toBe("pending");
    expect((await memberships.find(network.id, "bob"))?.status).toBe("pending");
  });

  it("auto-approves a public request", async () => {
    const { requestAccess, network, memberships } = await setup("public");
    const result = await requestAccess.execute({ networkId: network.id, userId: "bob" });
    expect(result.status).toBe("approved");
    expect((await memberships.find(network.id, "bob"))?.status).toBe("approved");
  });

  it("treats the owner as already approved without writing a membership", async () => {
    const { requestAccess, network, memberships } = await setup("private");
    const result = await requestAccess.execute({ networkId: network.id, userId: "alice" });
    expect(result.status).toBe("approved");
    expect(await memberships.find(network.id, "alice")).toBeNull();
  });

  it("is idempotent and returns the existing status", async () => {
    const { requestAccess, network } = await setup("private");
    await requestAccess.execute({ networkId: network.id, userId: "bob" });
    const again = await requestAccess.execute({ networkId: network.id, userId: "bob" });
    expect(again.status).toBe("pending");
  });
});
