import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConflictError } from "../../domain/errors/domain-error";
import { User } from "../../domain/user/user";
import { UserRepository } from "../../domain/user/user-repository";

interface UserItem {
  pk: string;
  sk: string;
  type: "USER";
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

function userKey(username: string): string {
  return `USER#${username}`;
}

function toItem(user: User): UserItem {
  return {
    pk: userKey(user.username),
    sk: userKey(user.username),
    type: "USER",
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
  };
}

function toUser(item: UserItem): User {
  return {
    id: item.id,
    username: item.username,
    passwordHash: item.passwordHash,
    createdAt: item.createdAt,
  };
}

export class DynamoUserRepository implements UserRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(user: User): Promise<void> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: toItem(user),
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new ConflictError(`username "${user.username}" already taken`);
      }
      throw err;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: userKey(username), sk: userKey(username) },
        ConsistentRead: true,
      }),
    );

    if (!result.Item) {
      return null;
    }
    return toUser(result.Item as UserItem);
  }
}
