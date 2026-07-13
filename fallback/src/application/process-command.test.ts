import { describe, it, expect } from "vitest";
import { ProcessCommand } from "./process-command";
import { FakeTorrentSeeder } from "../testing/fakes";

function join(fileId = "f1", infoHash = "h1") {
  return { cmd: "JOIN" as const, networkId: "n1", fileId, infoHash };
}

function leave(fileId = "f1") {
  return { cmd: "LEAVE" as const, networkId: "n1", fileId };
}

describe("ProcessCommand", () => {
  it("seeds on JOIN", async () => {
    const seeder = new FakeTorrentSeeder();
    await new ProcessCommand(seeder).execute(join());
    expect(seeder.isSeeding("f1")).toBe(true);
    expect(seeder.seedCalls).toEqual([{ fileId: "f1", infoHash: "h1" }]);
  });

  it("is idempotent: a repeated JOIN does not seed twice", async () => {
    const seeder = new FakeTorrentSeeder();
    const process = new ProcessCommand(seeder);
    await process.execute(join());
    await process.execute(join());
    expect(seeder.seedCalls).toHaveLength(1);
  });

  it("drops on LEAVE", async () => {
    const seeder = new FakeTorrentSeeder();
    const process = new ProcessCommand(seeder);
    await process.execute(join());
    await process.execute(leave());
    expect(seeder.isSeeding("f1")).toBe(false);
    expect(seeder.dropCalls).toEqual(["f1"]);
  });

  it("is idempotent: LEAVE when not seeding is a no-op", async () => {
    const seeder = new FakeTorrentSeeder();
    await new ProcessCommand(seeder).execute(leave());
    expect(seeder.dropCalls).toHaveLength(0);
  });

  it("handles a JOIN -> LEAVE -> JOIN cycle", async () => {
    const seeder = new FakeTorrentSeeder();
    const process = new ProcessCommand(seeder);
    await process.execute(join());
    await process.execute(leave());
    await process.execute(join());
    expect(seeder.isSeeding("f1")).toBe(true);
    expect(seeder.seedCalls).toHaveLength(2);
    expect(seeder.dropCalls).toHaveLength(1);
  });

  it("propagates a seeder failure (so the caller can retry without ack)", async () => {
    const seeder = new FakeTorrentSeeder();
    seeder.failNextSeed = true;
    await expect(new ProcessCommand(seeder).execute(join())).rejects.toThrow(/seed failed/);
    expect(seeder.isSeeding("f1")).toBe(false);
  });
});
