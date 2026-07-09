import { FileVersionRepository } from "../../domain/file/file-version-repository";
import { PeerPresenceStore } from "../../domain/peer/peer-presence-store";
import { FALLBACK_THRESHOLD, partitionPresence } from "../../domain/peer/presence-policy";
import { Network } from "../../domain/network/network";
import { NetworkRepository } from "../../domain/network/network-repository";
import { CommandQueue } from "../ports/command-queue";

export class EvaluateFallback {
  private readonly fallbackActive = new Map<string, boolean>();

  constructor(
    private readonly networks: NetworkRepository,
    private readonly versions: FileVersionRepository,
    private readonly presence: PeerPresenceStore,
    private readonly queue: CommandQueue,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async evaluateAll(): Promise<void> {
    const networks = await this.networks.listAll();
    for (const network of networks) {
      await this.evaluateOne(network);
    }
  }

  private async evaluateOne(network: Network): Promise<void> {
    const peers = await this.presence.listByNetwork(network.id);
    const { active, expired } = partitionPresence(peers, this.now());
    for (const peer of expired) {
      await this.presence.save({ ...peer, status: "offline" });
    }

    const shouldFallback = active.length <= FALLBACK_THRESHOLD;
    const wasActive = this.fallbackActive.get(network.id) ?? false;

    if (shouldFallback === wasActive) {
      return;
    }

    if (shouldFallback) {
      const current = await this.versions.findCurrent(network.id);
      if (!current) {
        return;
      }
      await this.queue.send({
        cmd: "JOIN",
        networkId: network.id,
        fileId: current.fileId,
        infoHash: current.infoHash,
      });
      this.fallbackActive.set(network.id, true);
    } else {
      await this.queue.send({
        cmd: "LEAVE",
        networkId: network.id,
        fileId: network.activeFileId ?? "",
      });
      this.fallbackActive.set(network.id, false);
    }
  }
}
