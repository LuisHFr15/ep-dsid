import { describe, it, expect } from "vitest";
import { DecideAccess } from "./decide-access";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-error";
import { createMembership } from "../../domain/network/membership";
import { createNetwork } from "../../domain/network/network";
import {
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

async function setup() {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const network = createNetwork({
    title: "docs",
    description: "",
    ownerId: "alice",
    accessMode: "private",
    updateMode: "centralized",
  });
  await networks.save(network);
  await memberships.save(createMembership(network.id, "bob", "bob", "pending"));
  const decideAccess = new DecideAccess(networks, memberships);
  return { network, memberships, decideAccess };
}

describe("DecideAccess", () => {
  it("approves a pending request and stamps decidedAt", async () => {
    const { network, memberships, decideAccess } = await setup();
    const result = await decideAccess.execute({
      networkId: network.id,
      ownerId: "alice",
      userId: "bob",
      decision: "approve",
    });
    expect(result.status).toBe("approved");
    const membership = await memberships.find(network.id, "bob");
    expect(membership?.status).toBe("approved");
    expect(membership?.decidedAt).not.toBeNull();
  });

  it("rejects a pending request", async () => {
    const { network, memberships, decideAccess } = await setup();
    const result = await decideAccess.execute({
      networkId: network.id,
      ownerId: "alice",
      userId: "bob",
      decision: "reject",
    });
    expect(result.status).toBe("rejected");
    expect((await memberships.find(network.id, "bob"))?.status).toBe("rejected");
  });

  it("forbids non-owners", async () => {
    const { network, decideAccess } = await setup();
    await expect(
      decideAccess.execute({
        networkId: network.id,
        ownerId: "bob",
        userId: "bob",
        decision: "approve",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("fails when the request does not exist", async () => {
    const { network, decideAccess } = await setup();
    await expect(
      decideAccess.execute({
        networkId: network.id,
        ownerId: "alice",
        userId: "ghost",
        decision: "approve",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
