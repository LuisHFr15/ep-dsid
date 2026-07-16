import { describe, it, expect } from "vitest";
import { ProcessCommand } from "./process-command";
import { FakeSeedStateStore, FakeTorrentSeeder } from "../testing/fakes";

function join(fileId = "f1", infoHash = "h1") {
  return { cmd: "JOIN" as const, networkId: "n1", fileId, infoHash };
}

function leave(fileId = "f1") {
  return { cmd: "LEAVE" as const, networkId: "n1", fileId };
}

function setup() {
  const state = new FakeSeedStateStore();
  const seeder = new FakeTorrentSeeder();
  const process = new ProcessCommand(state, seeder);
  return { state, seeder, process };
}

describe("ProcessCommand", () => {
  it("seeds on JOIN and records the desired state", async () => {
    const { state, seeder, process } = setup();
    await process.execute(join());
    expect(seeder.isSeeding("f1")).toBe(true);
    expect(seeder.seedCalls).toEqual([{ fileId: "f1", infoHash: "h1" }]);
    expect((await state.list()).map((e) => e.fileId)).toEqual(["f1"]);
  });

  it("is idempotent: a repeated JOIN does not seed twice", async () => {
    const { seeder, process } = setup();
    await process.execute(join());
    await process.execute(join());
    expect(seeder.seedCalls).toHaveLength(1);
  });

  it("drops on LEAVE and clears the desired state", async () => {
    const { state, seeder, process } = setup();
    await process.execute(join());
    await process.execute(leave());
    expect(seeder.isSeeding("f1")).toBe(false);
    expect(seeder.dropCalls).toEqual(["f1"]);
    expect(await state.list()).toEqual([]);
  });

  it("is idempotent: LEAVE when not seeding is a no-op", async () => {
    const { seeder, process } = setup();
    await process.execute(leave());
    expect(seeder.dropCalls).toHaveLength(0);
  });

  it("writes the desired state BEFORE seeding (write-ahead)", async () => {
    const { state, seeder, process } = setup();
    // seeder falha; mesmo assim o estado desejado ja deve ter sido persistido,
    // para que o restore no proximo boot retome.
    seeder.failNextSeed = true;
    await expect(process.execute(join())).rejects.toThrow(/seed failed/);
    expect((await state.list()).map((e) => e.fileId)).toEqual(["f1"]);
    expect(seeder.isSeeding("f1")).toBe(false);
  });

  it("handles a JOIN -> LEAVE -> JOIN cycle", async () => {
    const { state, seeder, process } = setup();
    await process.execute(join());
    await process.execute(leave());
    await process.execute(join());
    expect(seeder.isSeeding("f1")).toBe(true);
    expect(seeder.seedCalls).toHaveLength(2);
    expect(seeder.dropCalls).toHaveLength(1);
    expect((await state.list()).map((e) => e.fileId)).toEqual(["f1"]);
  });
});
