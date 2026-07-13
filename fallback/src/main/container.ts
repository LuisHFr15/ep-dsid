import { SQSClient } from "@aws-sdk/client-sqs";
import { ProcessCommand } from "../application/process-command";
import { Worker } from "../application/worker";
import { Config } from "../infrastructure/config/env";
import { SqsCommandConsumer } from "../infrastructure/sqs/sqs-command-consumer";
import { WebTorrentSeeder } from "../infrastructure/webtorrent/webtorrent-seeder";

export interface AppContainer {
  worker: Worker;
  seeder: WebTorrentSeeder;
}

export function buildContainer(config: Config): AppContainer {
  const sqsClient = new SQSClient({ region: config.aws.region });
  const consumer = new SqsCommandConsumer(
    sqsClient,
    config.aws.sqsQueueUrl,
    config.aws.waitTimeSeconds,
  );
  const seeder = new WebTorrentSeeder(config.seedDir);
  const processCommand = new ProcessCommand(seeder);
  const worker = new Worker(consumer, processCommand, (message, err) =>
    err ? console.error(message, err) : console.log(message),
  );

  return { worker, seeder };
}
