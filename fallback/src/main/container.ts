import { SQSClient } from "@aws-sdk/client-sqs";
import { ProcessCommand } from "../application/process-command";
import { SeedStateStore } from "../application/ports/seed-state-store";
import { TorrentSeeder } from "../application/ports/torrent-seeder";
import { Worker } from "../application/worker";
import { Config } from "../infrastructure/config/env";
import { FileSeedStateStore } from "../infrastructure/persistence/file-seed-state-store";
import { SqsCommandConsumer } from "../infrastructure/sqs/sqs-command-consumer";
import { WebTorrentSeeder } from "../infrastructure/webtorrent/webtorrent-seeder";

function log(message: string, err?: unknown) {
  if (err !== undefined) {
    console.error(message, err);
  } else {
    console.log(message);
  }
}

export interface AppContainer {
  worker: Worker;
  seeder: TorrentSeeder & { close(): Promise<void> };
  state: SeedStateStore;
}

export function buildContainer(config: Config): AppContainer {
  const sqsClient = new SQSClient({ region: config.aws.region });
  const consumer = new SqsCommandConsumer(
    sqsClient,
    config.aws.sqsQueueUrl,
    config.aws.waitTimeSeconds,
  );
  const seeder = new WebTorrentSeeder(config.seedDir, log);
  const state = new FileSeedStateStore(config.seedDir, log);
  const processCommand = new ProcessCommand(state, seeder);
  const worker = new Worker(consumer, processCommand, log);

  return { worker, seeder, state };
}
