export interface SeedStatus {
  fileId: string;
  name: string | null;
  progress: number; // 0..1
  numPeers: number;
  done: boolean;
}

export interface TorrentSeeder {
  seed(fileId: string, infoHash: string, magnet?: string | null): Promise<void>;
  drop(fileId: string): Promise<void>;
  // "está gerenciando este fileId" — usado para idempotência do JOIN (não implica
  // que o download terminou; use listStatus() para saber o progresso real).
  isSeeding(fileId: string): boolean;
  // Estado observável de cada torrent (progresso, peers, conclusão).
  listStatus(): SeedStatus[];
}
