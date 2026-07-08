import { CommandQueue, FallbackCommand } from "../application/ports/command-queue";

export class FakeCommandQueue implements CommandQueue {
  readonly sent: FallbackCommand[] = [];

  async send(command: FallbackCommand): Promise<void> {
    this.sent.push(command);
  }
}
