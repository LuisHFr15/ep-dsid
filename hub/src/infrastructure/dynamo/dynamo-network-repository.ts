import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConflictError } from "../../domain/errors/domain-error";
import { Network } from "../../domain/network/network";
import { NetworkRepository } from "../../domain/network/network-repository";

interface NetworkItem {
  pk: string;
  sk: "META";
  type: "NETWORK";
  gsi1pk: "CATALOG";
  gsi1sk: string;
  id: string;
  title: string;
  description: string;
  ownerId: string;
  accessMode: Network["accessMode"];
  updateMode: Network["updateMode"];
  activeFileId: string | null;
  createdAt: string;
}

function networkKey(id: string): string {
  return `NETWORK#${id}`;
}

function toItem(network: Network): NetworkItem {
  return {
    pk: networkKey(network.id),
    sk: "META",
    type: "NETWORK",
    gsi1pk: "CATALOG",
    gsi1sk: `${network.createdAt}#${network.id}`,
    id: network.id,
    title: network.title,
    description: network.description,
    ownerId: network.ownerId,
    accessMode: network.accessMode,
    updateMode: network.updateMode,
    activeFileId: network.activeFileId,
    createdAt: network.createdAt,
  };
}

function toNetwork(item: NetworkItem): Network {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    ownerId: item.ownerId,
    accessMode: item.accessMode,
    updateMode: item.updateMode,
    activeFileId: item.activeFileId,
    createdAt: item.createdAt,
  };
}

export class DynamoNetworkRepository implements NetworkRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(network: Network): Promise<void> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: toItem(network),
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new ConflictError(`network "${network.id}" already exists`);
      }
      throw err;
    }
  }

  async findById(id: string): Promise<Network | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: networkKey(id), sk: "META" },
        ConsistentRead: true,
      }),
    );

    if (!result.Item) {
      return null;
    }
    return toNetwork(result.Item as NetworkItem);
  }

  async listAll(): Promise<Network[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "gsi1",
        KeyConditionExpression: "gsi1pk = :catalog",
        ExpressionAttributeValues: { ":catalog": "CATALOG" },
      }),
    );

    return (result.Items ?? []).map((item) => toNetwork(item as NetworkItem));
  }

  async setActiveFile(networkId: string, fileId: string): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: networkKey(networkId), sk: "META" },
        UpdateExpression: "SET activeFileId = :fileId",
        ExpressionAttributeValues: { ":fileId": fileId },
      }),
    );
  }
}
