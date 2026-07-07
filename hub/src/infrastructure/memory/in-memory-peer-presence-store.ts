import { PeerPresence } from "../../domain/peer/peer-presence";
import { PeerPresenceStore } from "../../domain/peer/peer-presence-store";

export class InMemoryPeerPresenceStore implements PeerPresenceStore {
  private readonly presences = new Map<string, PeerPresence>();

  private key(networkId: string, peerId: string): string {
    return `${networkId}:${peerId}`;
  }

  async save(presence: PeerPresence): Promise<void> {
    this.presences.set(this.key(presence.networkId, presence.peerId), { ...presence });
  }

  async listByNetwork(networkId: string): Promise<PeerPresence[]> {
    return [...this.presences.values()]
      .filter((p) => p.networkId === networkId)
      .map((p) => ({ ...p }));
  }
}
