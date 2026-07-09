import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { CommandQueue, FallbackCommand } from "../../application/ports/command-queue";

export class SqsCommandQueue implements CommandQueue {
  constructor(
    private readonly client: SQSClient,
    private readonly queueUrl: string,
  ) {}

  async send(command: FallbackCommand): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(command),
      }),
    );
  }
}
