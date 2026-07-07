import { PeerPresence } from "./peer-presence";

export interface PeerPresenceStore {
  save(presence: PeerPresence): Promise<void>;
  listByNetwork(networkId: string): Promise<PeerPresence[]>;
}
