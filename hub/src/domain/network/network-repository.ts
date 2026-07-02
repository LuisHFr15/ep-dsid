import { Network } from "./network";

export interface NetworkRepository {
  save(network: Network): Promise<void>;
  findById(id: string): Promise<Network | null>;
  listAll(): Promise<Network[]>;
  setActiveFile(networkId: string, fileId: string): Promise<void>;
}
