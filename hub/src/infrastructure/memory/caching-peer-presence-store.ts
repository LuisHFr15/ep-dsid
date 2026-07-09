import { PeerPresence } from "../../domain/peer/peer-presence";
import { PeerPresenceStore } from "../../domain/peer/peer-presence-store";

export class CachingPeerPresenceStore implements PeerPresenceStore {
  private readonly entries = new Map<string, PeerPresence>();
  private readonly dirty = new Set<string>();

  constructor(private readonly delegate: PeerPresenceStore) {}

  private key(networkId: string, peerId: string): string {
    return `${networkId}:${peerId}`;
  }

  async save(presence: PeerPresence): Promise<void> {
    const key = this.key(presence.networkId, presence.peerId);
    this.entries.set(key, { ...presence });
    this.dirty.add(key);
  }

  async listByNetwork(networkId: string): Promise<PeerPresence[]> {
    return [...this.entries.values()]
      .filter((p) => p.networkId === networkId)
      .map((p) => ({ ...p }));
  }

  async flush(): Promise<number> {
    let flushed = 0;
    for (const key of [...this.dirty]) {
      const entry = this.entries.get(key);
      if (!entry) {
        this.dirty.delete(key);
        continue;
      }
      this.dirty.delete(key);
      try {
        await this.delegate.save(entry);
        flushed++;
      } catch {
        this.dirty.add(key);
      }
    }
    return flushed;
  }
}
