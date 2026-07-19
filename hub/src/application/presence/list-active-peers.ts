import { NotFoundError } from "../../domain/errors/domain-error";
import { PeerPresenceStore } from "../../domain/peer/peer-presence-store";
import { partitionPresence } from "../../domain/peer/presence-policy";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";
import { assertCanRead } from "../network/access-guards";

export interface ListActivePeersInput {
  networkId: string;
  requesterId: string;
}

export interface ActivePeer {
  username: string;
  lastSeenAt: string;
}

export interface ActivePeers {
  networkId: string;
  activePeers: ActivePeer[];
}

export class ListActivePeers {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
    private readonly presence: PeerPresenceStore,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(input: ListActivePeersInput): Promise<ActivePeers> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }

    await assertCanRead(network, input.requesterId, this.memberships);

    const peers = await this.presence.listByNetwork(input.networkId);
    const { active } = partitionPresence(peers, this.now());

    return {
      networkId: input.networkId,
      activePeers: active.map((p) => ({ username: p.username, lastSeenAt: p.lastSeenAt })),
    };
  }
}
