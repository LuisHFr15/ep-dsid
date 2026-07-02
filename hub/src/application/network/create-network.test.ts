import { describe, it, expect } from "vitest";
import { CreateNetwork } from "./create-network";
import {
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

function setup() {
  const networks = new InMemoryNetworkRepository();
  const memberships = new InMemoryMembershipRepository();
  const createNetwork = new CreateNetwork(networks, memberships);
  return { networks, memberships, createNetwork };
}

describe("CreateNetwork", () => {
  it("creates a network owned by the caller with no active file", async () => {
    const { createNetwork } = setup();
    const network = await createNetwork.execute({
      ownerId: "alice",
      title: "docs",
      description: "shared docs",
      accessMode: "private",
      updateMode: "centralized",
    });

    expect(network.ownerId).toBe("alice");
    expect(network.activeFileId).toBeNull();
    expect(network.id).toBeTruthy();
  });

  it("registers the owner as an approved member", async () => {
    const { createNetwork, memberships } = setup();
    const network = await createNetwork.execute({
      ownerId: "alice",
      title: "docs",
      description: "",
      accessMode: "private",
      updateMode: "collaborative",
    });

    const membership = await memberships.find(network.id, "alice");
    expect(membership?.status).toBe("approved");
  });
});
