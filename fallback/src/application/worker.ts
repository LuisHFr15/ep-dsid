import { CommandConsumer } from "./ports/command-consumer";
import { parseCommand } from "./parse-command";
import { ProcessCommand } from "./process-command";

export class Worker {
  constructor(
    private readonly consumer: CommandConsumer,
    private readonly processCommand: ProcessCommand,
    private readonly log: (message: string, err?: unknown) => void = () => {},
  ) {}

  // Processa um lote. Retorna quantas mensagens foram ackadas.
  async processBatch(): Promise<number> {
    const messages = await this.consumer.receive();
    let acked = 0;

    for (const message of messages) {
      let command;
      try {
        command = parseCommand(message.body);
      } catch (err) {
        // Poison message: retry nao ajuda, entao descarta (ack).
        this.log("dropping malformed message", err);
        await this.consumer.ack(message.receiptHandle);
        acked++;
        continue;
      }

      try {
        await this.processCommand.execute(command);
        await this.consumer.ack(message.receiptHandle);
        acked++;
      } catch (err) {
        // Falha transitoria: NAO acka, volta a fila apos o visibility timeout.
        this.log("processing failed, message will be retried", err);
      }
    }

    return acked;
  }
}
