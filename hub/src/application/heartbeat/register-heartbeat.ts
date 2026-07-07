import { MemoryStore } from "../../infrastructure/memory/memory-store";

type RegisterHeartbeatInput = {
  file_id: string;
  peer_uuid: string;
  user_id?: string;
  status?: "online" | "offline";
};

const PEER_TIMEOUT_MS = 30_000;

export class RegisterHeartbeat {
  constructor(private readonly store: MemoryStore) {}

  execute(input: RegisterHeartbeatInput) {
    const now = new Date();
    const nowIso = now.toISOString();

    const key = `${input.file_id}:${input.peer_uuid}`;

    const peer = {
      file_id: input.file_id,
      peer_uuid: input.peer_uuid,
      user_id: input.user_id ?? "dev-user",
      status: input.status ?? "online",
      last_seen: nowIso,
    };

    this.store.peers.set(key, peer);

    let expired_peers = 0;

    for (const [peerKey, storedPeer] of this.store.peers.entries()) {
      if (storedPeer.file_id !== input.file_id) {
        continue;
      }

      if (storedPeer.status !== "online") {
        continue;
      }

      const lastSeen = new Date(storedPeer.last_seen).getTime();
      const ageMs = now.getTime() - lastSeen;

      if (ageMs > PEER_TIMEOUT_MS) {
        this.store.peers.set(peerKey, {
          ...storedPeer,
          status: "offline",
        });

        expired_peers++;
      }
    }

    const activePeers = Array.from(this.store.peers.values()).filter(
      (p) => p.file_id === input.file_id && p.status === "online"
    );

    return {
      status: "ok",
      file_id: input.file_id,
      peer_uuid: input.peer_uuid,
      active_peers: activePeers.length,
      expired_peers,
      should_activate_fallback: activePeers.length <= 4,
    };
  }
}