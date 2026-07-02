import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { LamportClock } from "../../application/ports/lamport-clock";

function networkKey(networkId: string): string {
  return `NETWORK#${networkId}`;
}

function clockKey(networkId: string): string {
  return `CLOCK#${networkId}`;
}

export class DynamoLamportClock implements LamportClock {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async next(networkId: string): Promise<number> {
    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: networkKey(networkId), sk: clockKey(networkId) },
        UpdateExpression: "ADD #value :one",
        ExpressionAttributeNames: { "#value": "value" },
        ExpressionAttributeValues: { ":one": 1 },
        ReturnValues: "ALL_NEW",
      }),
    );

    return result.Attributes?.value as number;
  }
}
