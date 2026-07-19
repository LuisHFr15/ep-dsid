export interface TorrentSeeder {
  seed(fileId: string, infoHash: string, magnet?: string | null): Promise<void>;
  drop(fileId: string): Promise<void>;
  isSeeding(fileId: string): boolean;
}
