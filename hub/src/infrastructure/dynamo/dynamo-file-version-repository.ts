import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { FileVersion } from "../../domain/file/file-version";
import { FileVersionRepository } from "../../domain/file/file-version-repository";

interface FileVersionItem {
  pk: string;
  sk: string;
  type: "VERSION";
  networkId: string;
  fileId: string;
  versionId: string;
  parentVersionId: string | null;
  infoHash: string;
  magnet: string | null;
  filename: string;
  size: number | null;
  lamportTs: number;
  authorId: string;
  createdAt: string;
}

const LAMPORT_PAD = 12;

function networkKey(networkId: string): string {
  return `NETWORK#${networkId}`;
}

function versionKey(lamportTs: number, versionId: string): string {
  return `VERSION#${String(lamportTs).padStart(LAMPORT_PAD, "0")}#${versionId}`;
}

function toItem(v: FileVersion): FileVersionItem {
  return {
    pk: networkKey(v.networkId),
    sk: versionKey(v.lamportTs, v.versionId),
    type: "VERSION",
    networkId: v.networkId,
    fileId: v.fileId,
    versionId: v.versionId,
    parentVersionId: v.parentVersionId,
    infoHash: v.infoHash,
    magnet: v.magnet,
    filename: v.filename,
    size: v.size,
    lamportTs: v.lamportTs,
    authorId: v.authorId,
    createdAt: v.createdAt,
  };
}

function toVersion(item: FileVersionItem): FileVersion {
  return {
    networkId: item.networkId,
    fileId: item.fileId,
    versionId: item.versionId,
    parentVersionId: item.parentVersionId,
    infoHash: item.infoHash,
    magnet: item.magnet,
    filename: item.filename,
    size: item.size,
    lamportTs: item.lamportTs,
    authorId: item.authorId,
    createdAt: item.createdAt,
  };
}

export class DynamoFileVersionRepository implements FileVersionRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(version: FileVersion): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: toItem(version),
      }),
    );
  }

  async findCurrent(networkId: string): Promise<FileVersion | null> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :version)",
        ExpressionAttributeValues: {
          ":pk": networkKey(networkId),
          ":version": "VERSION#",
        },
        ScanIndexForward: false,
        Limit: 1,
      }),
    );

    const item = result.Items?.[0];
    return item ? toVersion(item as FileVersionItem) : null;
  }

  async findByVersionId(networkId: string, versionId: string): Promise<FileVersion | null> {
    const versions = await this.listVersions(networkId);
    return versions.find((v) => v.versionId === versionId) ?? null;
  }

  async listConcurrent(networkId: string, parentVersionId: string): Promise<FileVersion[]> {
    const versions = await this.listVersions(networkId);
    return versions.filter((v) => v.parentVersionId === parentVersionId);
  }

  async listVersions(networkId: string): Promise<FileVersion[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :version)",
        ExpressionAttributeValues: {
          ":pk": networkKey(networkId),
          ":version": "VERSION#",
        },
      }),
    );

    return (result.Items ?? []).map((item) => toVersion(item as FileVersionItem));
  }
}
