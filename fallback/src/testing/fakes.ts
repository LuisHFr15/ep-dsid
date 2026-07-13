import { CommandConsumer, RawMessage } from "../application/ports/command-consumer";
import { TorrentSeeder } from "../application/ports/torrent-seeder";

export class FakeTorrentSeeder implements TorrentSeeder {
  readonly seeding = new Map<string, string>();
  readonly seedCalls: Array<{ fileId: string; infoHash: string }> = [];
  readonly dropCalls: string[] = [];
  failNextSeed = false;

  async seed(fileId: string, infoHash: string): Promise<void> {
    if (this.failNextSeed) {
      this.failNextSeed = false;
      throw new Error("seed failed");
    }
    this.seedCalls.push({ fileId, infoHash });
    this.seeding.set(fileId, infoHash);
  }

  async drop(fileId: string): Promise<void> {
    this.dropCalls.push(fileId);
    this.seeding.delete(fileId);
  }

  isSeeding(fileId: string): boolean {
    return this.seeding.has(fileId);
  }
}

export class FakeCommandConsumer implements CommandConsumer {
  readonly acked: string[] = [];

  constructor(private batches: RawMessage[][] = []) {}

  async receive(): Promise<RawMessage[]> {
    return this.batches.shift() ?? [];
  }

  async ack(receiptHandle: string): Promise<void> {
    this.acked.push(receiptHandle);
  }
}
