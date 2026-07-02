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
});
