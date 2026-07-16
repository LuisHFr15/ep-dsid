export interface SeedEntry {
  networkId: string;
  fileId: string;
  infoHash: string;
}

export interface SeedStateStore {
  add(entry: SeedEntry): Promise<void>;
  remove(fileId: string): Promise<void>;
  list(): Promise<SeedEntry[]>;
}
