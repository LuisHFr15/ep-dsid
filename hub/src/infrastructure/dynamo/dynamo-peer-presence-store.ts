import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { PeerPresence, PresenceStatus } from "../../domain/peer/peer-presence";
import { PeerPresenceStore } from "../../domain/peer/peer-presence-store";

interface PeerItem {
  pk: string;
  sk: string;
  type: "PEER";
  networkId: string;
  peerId: string;
  userId: string;
  username: string;
  status: PresenceStatus;
  lastSeenAt: string;
}

function networkKey(networkId: string): string {
  return `NETWORK#${networkId}`;
}

function peerKey(peerId: string): string {
  return `PEER#${peerId}`;
}

function toItem(presence: PeerPresence): PeerItem {
  return {
    pk: networkKey(presence.networkId),
    sk: peerKey(presence.peerId),
    type: "PEER",
    networkId: presence.networkId,
    peerId: presence.peerId,
    userId: presence.userId,
    username: presence.username,
    status: presence.status,
    lastSeenAt: presence.lastSeenAt,
  };
}

function toPresence(item: PeerItem): PeerPresence {
  return {
    networkId: item.networkId,
    peerId: item.peerId,
    userId: item.userId,
    // Itens antigos (antes deste campo) não têm username; presença é efêmera
    // e o próximo heartbeat regrava com o valor correto.
    username: item.username ?? "",
    status: item.status,
    lastSeenAt: item.lastSeenAt,
  };
}

export class DynamoPeerPresenceStore implements PeerPresenceStore {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(presence: PeerPresence): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: toItem(presence),
      }),
    );
  }

  async listByNetwork(networkId: string): Promise<PeerPresence[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :peer)",
        ExpressionAttributeValues: {
          ":pk": networkKey(networkId),
          ":peer": "PEER#",
        },
        ConsistentRead: true,
      }),
    );

    return (result.Items ?? []).map((item) => toPresence(item as PeerItem));
  }
}
