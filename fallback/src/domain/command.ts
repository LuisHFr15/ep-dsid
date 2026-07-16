// Espelho do contrato produzido pelo hub (hub/src/application/ports/command-queue.ts).
// Deve casar exatamente com o que o produtor SQS envia.

export interface JoinCommand {
  cmd: "JOIN";
  networkId: string;
  fileId: string;
  infoHash: string;
}

export interface LeaveCommand {
  cmd: "LEAVE";
  networkId: string;
  fileId: string;
}

export type FallbackCommand = JoinCommand | LeaveCommand;
