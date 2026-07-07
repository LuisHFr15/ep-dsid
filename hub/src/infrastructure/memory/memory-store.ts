export type FileVisibility = "public" | "private";

export type FileRecord = {
  file_id: string;
  title: string;
  description?: string;
  owner_id: string;
  current_version_id: string;
  visibility: FileVisibility;
  created_at: string;
};

export type VersionRecord = {
  version_id: string;
  file_id: string;
  parent_version_id?: string;
  file_info_hash: string;
  magnet_uri: string;
  lamport_ts: number;
  author_id: string;
  created_at: string;
};

export type PeerPresence = {
  file_id: string;
  peer_uuid: string;
  user_id: string;
  status: "online" | "offline";
  last_seen: string;
};

export class MemoryStore {
  files = new Map<string, FileRecord>();
  versions = new Map<string, VersionRecord>();
  peers = new Map<string, PeerPresence>();
  
}