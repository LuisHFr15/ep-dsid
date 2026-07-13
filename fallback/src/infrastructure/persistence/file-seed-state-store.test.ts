import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSeedStateStore } from "./file-seed-state-store";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "seed-state-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function entry(fileId: string) {
  return { networkId: "n1", fileId, infoHash: `h-${fileId}` };
}

describe("FileSeedStateStore", () => {
  it("returns an empty list when the file does not exist", async () => {
    const store = new FileSeedStateStore(dir);
    expect(await store.list()).toEqual([]);
  });

  it("persists add and reads it back", async () => {
    const store = new FileSeedStateStore(dir);
    await store.add(entry("f1"));
    await store.add(entry("f2"));
    const list = await store.list();
    expect(list.map((e) => e.fileId).sort()).toEqual(["f1", "f2"]);
  });

  it("is idempotent on add (same fileId does not duplicate)", async () => {
    const store = new FileSeedStateStore(dir);
    await store.add(entry("f1"));
    await store.add(entry("f1"));
    expect(await store.list()).toHaveLength(1);
  });

  it("removes an entry", async () => {
    const store = new FileSeedStateStore(dir);
    await store.add(entry("f1"));
    await store.add(entry("f2"));
    await store.remove("f1");
    expect((await store.list()).map((e) => e.fileId)).toEqual(["f2"]);
  });

  it("remove of an absent fileId is a no-op", async () => {
    const store = new FileSeedStateStore(dir);
    await store.add(entry("f1"));
    await store.remove("ghost");
    expect(await store.list()).toHaveLength(1);
  });

  it("persists across store instances (durability)", async () => {
    await new FileSeedStateStore(dir).add(entry("f1"));
    const reopened = new FileSeedStateStore(dir);
    expect((await reopened.list()).map((e) => e.fileId)).toEqual(["f1"]);
  });

  it("tolerates a corrupt state file (returns empty, does not throw)", async () => {
    await writeFile(join(dir, "seed-state.json"), "{not json", "utf8");
    const store = new FileSeedStateStore(dir);
    expect(await store.list()).toEqual([]);
  });

  it("does not leave a .tmp file behind after a write", async () => {
    const store = new FileSeedStateStore(dir);
    await store.add(entry("f1"));
    const files = await readdir(dir);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });
});
