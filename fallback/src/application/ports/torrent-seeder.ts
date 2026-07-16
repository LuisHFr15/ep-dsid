export interface TorrentSeeder {
  seed(fileId: string, infoHash: string): Promise<void>;
  drop(fileId: string): Promise<void>;
  isSeeding(fileId: string): boolean;
}
