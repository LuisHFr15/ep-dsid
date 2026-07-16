import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { CommandConsumer, RawMessage } from "../../application/ports/command-consumer";

export class SqsCommandConsumer implements CommandConsumer {
  constructor(
    private readonly client: SQSClient,
    private readonly queueUrl: string,
    private readonly waitTimeSeconds: number,
  ) {}

  async receive(): Promise<RawMessage[]> {
    const result = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: this.waitTimeSeconds,
      }),
    );

    return (result.Messages ?? [])
      .filter((m) => m.Body !== undefined && m.ReceiptHandle !== undefined)
      .map((m) => ({ body: m.Body as string, receiptHandle: m.ReceiptHandle as string }));
  }

  async ack(receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }
}
