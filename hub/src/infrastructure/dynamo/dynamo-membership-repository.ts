import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConflictError } from "../../domain/errors/domain-error";
import { Membership, MembershipStatus } from "../../domain/network/membership";
import { MembershipRepository } from "../../domain/network/membership-repository";

interface MembershipItem {
  pk: string;
  sk: string;
  type: "MEMBERSHIP";
  networkId: string;
  userId: string;
  username: string;
  status: MembershipStatus;
  requestedAt: string;
  decidedAt: string | null;
}

function networkKey(networkId: string): string {
  return `NETWORK#${networkId}`;
}

function memberKey(userId: string): string {
  return `MEMBER#${userId}`;
}

function toItem(m: Membership): MembershipItem {
  return {
    pk: networkKey(m.networkId),
    sk: memberKey(m.userId),
    type: "MEMBERSHIP",
    networkId: m.networkId,
    userId: m.userId,
    username: m.username,
    status: m.status,
    requestedAt: m.requestedAt,
    decidedAt: m.decidedAt,
  };
}

function toMembership(item: MembershipItem): Membership {
  return {
    networkId: item.networkId,
    userId: item.userId,
    // Memberships antigos (antes deste campo) não têm username.
    username: item.username ?? "",
    status: item.status,
    requestedAt: item.requestedAt,
    decidedAt: item.decidedAt,
  };
}

export class DynamoMembershipRepository implements MembershipRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(membership: Membership): Promise<void> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: toItem(membership),
          ConditionExpression: "attribute_not_exists(sk)",
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new ConflictError("membership already exists");
      }
      throw err;
    }
  }

  async find(networkId: string, userId: string): Promise<Membership | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: networkKey(networkId), sk: memberKey(userId) },
        ConsistentRead: true,
      }),
    );

    if (!result.Item) {
      return null;
    }
    return toMembership(result.Item as MembershipItem);
  }

  async listPending(networkId: string): Promise<Membership[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :member)",
        FilterExpression: "#status = :pending",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":pk": networkKey(networkId),
          ":member": "MEMBER#",
          ":pending": "pending",
        },
      }),
    );

    return (result.Items ?? []).map((item) => toMembership(item as MembershipItem));
  }

  async updateStatus(
    networkId: string,
    userId: string,
    status: MembershipStatus,
    decidedAt: string,
  ): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: networkKey(networkId), sk: memberKey(userId) },
        UpdateExpression: "SET #status = :status, decidedAt = :decidedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status, ":decidedAt": decidedAt },
      }),
    );
  }
}
