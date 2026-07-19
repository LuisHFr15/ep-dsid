import { describe, it, expect } from "vitest";
import { ListPendingRequests } from "./list-pending-requests";
import { ForbiddenError } from "../../domain/errors/domain-error";
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
  await memberships.save(createMembership(network.id, "carol", "carol", "approved"));
  const listPending = new ListPendingRequests(networks, memberships);
  return { network, listPending };
}

describe("ListPendingRequests", () => {
  it("returns only pending requests for the owner", async () => {
    const { network, listPending } = await setup();
    const pending = await listPending.execute({ networkId: network.id, requesterId: "alice" });
    expect(pending.map((p) => p.userId)).toEqual(["bob"]);
    expect(pending[0]).toMatchObject({ userId: "bob", username: "bob" });
  });

  it("forbids non-owners", async () => {
    const { network, listPending } = await setup();
    await expect(
      listPending.execute({ networkId: network.id, requesterId: "bob" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
