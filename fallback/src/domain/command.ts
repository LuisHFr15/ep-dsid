// Espelho do contrato produzido pelo hub (hub/src/application/ports/command-queue.ts).
// Deve casar exatamente com o que o produtor SQS envia.

export interface JoinCommand {
  cmd: "JOIN";
  networkId: string;
  fileId: string;
  infoHash: string;
  // Magnet completo (com trackers) quando o hub o tiver. Preferido sobre o
  // infoHash puro para descoberta de peers ao baixar/semear.
  magnet?: string | null;
}

export interface LeaveCommand {
  cmd: "LEAVE";
  networkId: string;
  fileId: string;
}

export type FallbackCommand = JoinCommand | LeaveCommand;
