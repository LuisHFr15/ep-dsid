import { describe, it, expect } from "vitest";
import { Worker } from "./worker";
import { ProcessCommand } from "./process-command";
import { FakeCommandConsumer, FakeSeedStateStore, FakeTorrentSeeder } from "../testing/fakes";
import { RawMessage } from "./ports/command-consumer";

function msg(body: unknown, receiptHandle: string): RawMessage {
  return { body: typeof body === "string" ? body : JSON.stringify(body), receiptHandle };
}

describe("Worker.processBatch", () => {
  it("processes a valid command and acks it", async () => {
    const seeder = new FakeTorrentSeeder();
    const consumer = new FakeCommandConsumer([
      [msg({ cmd: "JOIN", networkId: "n1", fileId: "f1", infoHash: "h1" }, "r1")],
    ]);
    const worker = new Worker(consumer, new ProcessCommand(new FakeSeedStateStore(), seeder));

    const acked = await worker.processBatch();
    expect(acked).toBe(1);
    expect(consumer.acked).toEqual(["r1"]);
    expect(seeder.isSeeding("f1")).toBe(true);
  });

  it("acks (discards) a malformed message without processing", async () => {
    const seeder = new FakeTorrentSeeder();
    const consumer = new FakeCommandConsumer([[msg("{not json", "r-bad")]]);
    const worker = new Worker(consumer, new ProcessCommand(new FakeSeedStateStore(), seeder));

    const acked = await worker.processBatch();
    expect(acked).toBe(1);
    expect(consumer.acked).toEqual(["r-bad"]);
    expect(seeder.seedCalls).toHaveLength(0);
  });

  it("does not ack when processing fails (so it is retried)", async () => {
    const seeder = new FakeTorrentSeeder();
    seeder.failNextSeed = true;
    const consumer = new FakeCommandConsumer([
      [msg({ cmd: "JOIN", networkId: "n1", fileId: "f1", infoHash: "h1" }, "r1")],
    ]);
    const worker = new Worker(consumer, new ProcessCommand(new FakeSeedStateStore(), seeder));

    const acked = await worker.processBatch();
    expect(acked).toBe(0);
    expect(consumer.acked).toEqual([]);
  });

  it("handles a mixed batch: valid acked, malformed discarded, failing kept", async () => {
    const seeder = new FakeTorrentSeeder();
    seeder.failNextSeed = true; // fará a primeira operação de seed falhar
    const consumer = new FakeCommandConsumer([
      [
        msg({ cmd: "JOIN", networkId: "n1", fileId: "f1", infoHash: "h1" }, "r-fail"),
        msg("garbage", "r-bad"),
        msg({ cmd: "LEAVE", networkId: "n1", fileId: "f2" }, "r-ok"),
      ],
    ]);
    const worker = new Worker(consumer, new ProcessCommand(new FakeSeedStateStore(), seeder));

    await worker.processBatch();
    // r-fail: seed falhou -> nao ackado; r-bad: malformado -> ackado; r-ok: LEAVE no-op -> ackado
    expect(consumer.acked.sort()).toEqual(["r-bad", "r-ok"]);
  });

  it("returns zero on an empty batch", async () => {
    const seeder = new FakeTorrentSeeder();
    const worker = new Worker(new FakeCommandConsumer([]), new ProcessCommand(new FakeSeedStateStore(), seeder));
    expect(await worker.processBatch()).toBe(0);
  });
});
