import { CommandQueue, FallbackCommand } from "../../application/ports/command-queue";

export class LoggingCommandQueue implements CommandQueue {
  async send(command: FallbackCommand): Promise<void> {
    console.log("fallback command (no queue configured)", JSON.stringify(command));
  }
}
