import { describe, it, expect } from "vitest";
import { ListNetworks } from "./list-networks";
import { createNetwork } from "../../domain/network/network";
import { createMembership } from "../../domain/network/membership";
import {
  InMemoryMembershipRepository,
  InMemoryNetworkRepository,
} from "../../testing/in-memory-repositories";

describe("ListNetworks", () => {
  it("returns a public summary of every network", async () => {
    const networks = new InMemoryNetworkRepository();
    await networks.save(
      createNetwork({
        title: "docs",
        description: "shared",
        ownerId: "alice",
        accessMode: "private",
        updateMode: "centralized",
      }),
    );
    const listNetworks = new ListNetworks(networks, new InMemoryMembershipRepository());

    const result = await listNetworks.execute({ requesterId: "alice" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("docs");
    expect(result[0]).not.toHaveProperty("passwordHash");
  });

  it("returns an empty list when there are no networks", async () => {
    const listNetworks = new ListNetworks(
      new InMemoryNetworkRepository(),
      new InMemoryMembershipRepository(),
    );
    expect(await listNetworks.execute({ requesterId: "alice" })).toEqual([]);
  });

  describe("membershipStatus", () => {
    it("reports owner/approved/pending/none for the requester", async () => {
      const networks = new InMemoryNetworkRepository();
      const memberships = new InMemoryMembershipRepository();
      const owned = createNetwork({ title: "owned", description: "", ownerId: "alice", accessMode: "private", updateMode: "centralized" });
      const joined = createNetwork({ title: "joined", description: "", ownerId: "bob", accessMode: "private", updateMode: "centralized" });
      const waiting = createNetwork({ title: "waiting", description: "", ownerId: "bob", accessMode: "private", updateMode: "centralized" });
      const stranger = createNetwork({ title: "stranger", description: "", ownerId: "bob", accessMode: "private", updateMode: "centralized" });
      await networks.save(owned);
      await networks.save(joined);
      await networks.save(waiting);
      await networks.save(stranger);
      await memberships.save(createMembership(joined.id, "alice", "alice", "approved"));
      await memberships.save(createMembership(waiting.id, "alice", "alice", "pending"));

      const listNetworks = new ListNetworks(networks, memberships);
      const result = await listNetworks.execute({ requesterId: "alice" });
      const byTitle = Object.fromEntries(result.map((n) => [n.title, n.membershipStatus]));

      expect(byTitle).toEqual({
        owned: "owner",
        joined: "approved",
        waiting: "pending",
        stranger: "none",
      });
    });
  });

  describe("filtering", () => {
    async function seeded() {
      const networks = new InMemoryNetworkRepository();
      await networks.save(
        createNetwork({ title: "Relatorio anual", description: "financeiro", tags: ["report", "2026"], ownerId: "alice", accessMode: "public", updateMode: "centralized" }),
      );
      await networks.save(
        createNetwork({ title: "Fotos", description: "viagem", tags: ["media"], ownerId: "bob", accessMode: "public", updateMode: "centralized" }),
      );
      await networks.save(
        createNetwork({ title: "Backup", description: "relatorios antigos", tags: ["report"], ownerId: "alice", accessMode: "public", updateMode: "centralized" }),
      );
      return new ListNetworks(networks, new InMemoryMembershipRepository());
    }

    it("matches q against title case-insensitively", async () => {
      const listNetworks = await seeded();
      const result = await listNetworks.execute({ requesterId: "alice", q: "relatorio" });
      expect(result.map((n) => n.title).sort()).toEqual(["Backup", "Relatorio anual"]);
    });

    it("matches q against tags", async () => {
      const listNetworks = await seeded();
      const result = await listNetworks.execute({ requesterId: "alice", q: "media" });
      expect(result.map((n) => n.title)).toEqual(["Fotos"]);
    });

    it("matches an exact tag", async () => {
      const listNetworks = await seeded();
      const result = await listNetworks.execute({ requesterId: "alice", tag: "report" });
      expect(result.map((n) => n.title).sort()).toEqual(["Backup", "Relatorio anual"]);
    });

    it("combines q and tag with AND", async () => {
      const listNetworks = await seeded();
      const result = await listNetworks.execute({ requesterId: "alice", q: "anual", tag: "report" });
      expect(result.map((n) => n.title)).toEqual(["Relatorio anual"]);
    });

    it("returns everything with no filter", async () => {
      const listNetworks = await seeded();
      expect(await listNetworks.execute({ requesterId: "alice" })).toHaveLength(3);
    });
  });
});
