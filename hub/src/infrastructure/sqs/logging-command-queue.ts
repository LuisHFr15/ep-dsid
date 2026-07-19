import { CommandQueue, FallbackCommand } from "../../application/ports/command-queue";

// Decorator: loga cada comando de fallback e delega para a fila real, se houver.
// Sem delegate (SQS não configurado), apenas loga — útil em dev/local, onde os
// comandos não têm para onde ir. Torna JOIN/LEAVE observáveis (o SqsCommandQueue
// puro não loga nada).
export class LoggingCommandQueue implements CommandQueue {
  constructor(private readonly delegate?: CommandQueue) {}

  async send(command: FallbackCommand): Promise<void> {
    if (!this.delegate) {
      console.log("fallback command (no queue configured)", JSON.stringify(command));
      return;
    }

    console.log(`fallback -> ${command.cmd} rede=${command.networkId} arquivo=${command.fileId}`);
    await this.delegate.send(command);
  }
}
