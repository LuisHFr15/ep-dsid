import { describe, it, expect } from "vitest";
import { restoreSeeding } from "./restore-seeding";
import { FakeSeedStateStore, FakeTorrentSeeder } from "../testing/fakes";

function entry(fileId: string) {
  return { networkId: "n1", fileId, infoHash: `h-${fileId}` };
}

describe("restoreSeeding", () => {
  it("re-seeds every persisted entry on boot", async () => {
    const state = new FakeSeedStateStore();
    await state.add(entry("f1"));
    await state.add(entry("f2"));
    const seeder = new FakeTorrentSeeder();

    const restored = await restoreSeeding(state, seeder);
    expect(restored).toBe(2);
    expect(seeder.isSeeding("f1")).toBe(true);
    expect(seeder.isSeeding("f2")).toBe(true);
  });

  it("skips entries already being seeded", async () => {
    const state = new FakeSeedStateStore();
    await state.add(entry("f1"));
    const seeder = new FakeTorrentSeeder();
    await seeder.seed("f1", "h-f1"); // ja ativo

    const restored = await restoreSeeding(state, seeder);
    expect(restored).toBe(0);
    expect(seeder.seedCalls).toHaveLength(1); // nao semeou de novo
  });

  it("returns zero for an empty state", async () => {
    const restored = await restoreSeeding(new FakeSeedStateStore(), new FakeTorrentSeeder());
    expect(restored).toBe(0);
  });

  it("is non-blocking: a failing entry does not stop the others", async () => {
    const state = new FakeSeedStateStore();
    await state.add(entry("bad"));
    await state.add(entry("good"));
    const seeder = new FakeTorrentSeeder();
    seeder.failNextSeed = true; // falha o primeiro seed

    const restored = await restoreSeeding(state, seeder);
    expect(restored).toBe(1);
    expect(seeder.isSeeding("good")).toBe(true);
  });
});
