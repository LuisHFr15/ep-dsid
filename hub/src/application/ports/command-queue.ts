export interface JoinCommand {
  cmd: "JOIN";
  networkId: string;
  fileId: string;
  infoHash: string;
  magnet: string | null;
}

export interface LeaveCommand {
  cmd: "LEAVE";
  networkId: string;
  fileId: string;
}

export type FallbackCommand = JoinCommand | LeaveCommand;

export interface CommandQueue {
  send(command: FallbackCommand): Promise<void>;
}
