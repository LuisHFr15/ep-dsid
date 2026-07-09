import { describe, it, expect } from "vitest";
import { ListNetworks } from "./list-networks";
import { createNetwork } from "../../domain/network/network";
import { InMemoryNetworkRepository } from "../../testing/in-memory-repositories";

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
    const listNetworks = new ListNetworks(networks);

    const result = await listNetworks.execute();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("docs");
    expect(result[0]).not.toHaveProperty("passwordHash");
  });

  it("returns an empty list when there are no networks", async () => {
    const listNetworks = new ListNetworks(new InMemoryNetworkRepository());
    expect(await listNetworks.execute()).toEqual([]);
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
      return new ListNetworks(networks);
    }

    it("matches q against title case-insensitively", async () => {
      const listNetworks = await seeded();
      const result = await listNetworks.execute({ q: "relatorio" });
      expect(result.map((n) => n.title).sort()).toEqual(["Backup", "Relatorio anual"]);
    });

    it("matches q against tags", async () => {
      const listNetworks = await seeded();
      const result = await listNetworks.execute({ q: "media" });
      expect(result.map((n) => n.title)).toEqual(["Fotos"]);
    });

    it("matches an exact tag", async () => {
      const listNetworks = await seeded();
      const result = await listNetworks.execute({ tag: "report" });
      expect(result.map((n) => n.title).sort()).toEqual(["Backup", "Relatorio anual"]);
    });

    it("combines q and tag with AND", async () => {
      const listNetworks = await seeded();
      const result = await listNetworks.execute({ q: "anual", tag: "report" });
      expect(result.map((n) => n.title)).toEqual(["Relatorio anual"]);
    });

    it("returns everything with no filter", async () => {
      const listNetworks = await seeded();
      expect(await listNetworks.execute()).toHaveLength(3);
    });
  });
});
