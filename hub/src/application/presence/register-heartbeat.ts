import { NotFoundError } from "../../domain/errors/domain-error";
import { createPresence } from "../../domain/peer/peer-presence";
import { PeerPresenceStore } from "../../domain/peer/peer-presence-store";
import { partitionPresence } from "../../domain/peer/presence-policy";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { NetworkRepository } from "../../domain/network/network-repository";
import { assertCanRead } from "../network/access-guards";

export interface RegisterHeartbeatInput {
  networkId: string;
  peerId: string;
  userId: string;
}

export interface RegisterHeartbeatResult {
  networkId: string;
  peerId: string;
  activePeers: number;
}

export class RegisterHeartbeat {
  constructor(
    private readonly networks: NetworkRepository,
    private readonly memberships: MembershipRepository,
    private readonly presence: PeerPresenceStore,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(input: RegisterHeartbeatInput): Promise<RegisterHeartbeatResult> {
    const network = await this.networks.findById(input.networkId);
    if (!network) {
      throw new NotFoundError("network not found");
    }

    await assertCanRead(network, input.userId, this.memberships);

    const nowMs = this.now();
    const nowIso = new Date(nowMs).toISOString();
    await this.presence.save(createPresence(input.networkId, input.peerId, input.userId, nowIso));

    const peers = await this.presence.listByNetwork(input.networkId);
    const { active, expired } = partitionPresence(peers, nowMs);
    for (const peer of expired) {
      await this.presence.save({ ...peer, status: "offline" });
    }

    return {
      networkId: input.networkId,
      peerId: input.peerId,
      activePeers: active.length,
    };
  }
}
