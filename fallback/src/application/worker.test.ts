import { describe, it, expect } from "vitest";
import { Worker } from "./worker";
import { ProcessCommand } from "./process-command";
import { FakeCommandConsumer, FakeSeedStateStore, FakeTorrentSeeder } from "../testing/fakes";
import { RawMessage } from "./ports/command-consumer";

function msg(body: unknown, receiptHandle: string): RawMessage {
  return { body: typeof body === "string" ? body : JSON.stringify(body), receiptHandle };
}

// IDs válidos (UUID / hex) — o parse-command agora rejeita formatos inválidos.
const NID = "11111111-1111-4111-8111-111111111111";
const F1 = "22222222-2222-4222-8222-222222222222";
const F2 = "33333333-3333-4333-8333-333333333333";
const HASH = "0123456789abcdef0123456789abcdef01234567";

describe("Worker.processBatch", () => {
  it("processes a valid command and acks it", async () => {
    const seeder = new FakeTorrentSeeder();
    const consumer = new FakeCommandConsumer([
      [msg({ cmd: "JOIN", networkId: NID, fileId: F1, infoHash: HASH }, "r1")],
    ]);
    const worker = new Worker(consumer, new ProcessCommand(new FakeSeedStateStore(), seeder));

    const acked = await worker.processBatch();
    expect(acked).toBe(1);
    expect(consumer.acked).toEqual(["r1"]);
    expect(seeder.isSeeding(F1)).toBe(true);
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
      [msg({ cmd: "JOIN", networkId: NID, fileId: F1, infoHash: HASH }, "r1")],
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
        msg({ cmd: "JOIN", networkId: NID, fileId: F1, infoHash: HASH }, "r-fail"),
        msg("garbage", "r-bad"),
        msg({ cmd: "LEAVE", networkId: NID, fileId: F2 }, "r-ok"),
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
