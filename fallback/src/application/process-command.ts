import { FallbackCommand } from "../domain/command";
import { TorrentSeeder } from "./ports/torrent-seeder";

export class ProcessCommand {
  constructor(private readonly seeder: TorrentSeeder) {}

  async execute(command: FallbackCommand): Promise<void> {
    if (command.cmd === "JOIN") {
      if (this.seeder.isSeeding(command.fileId)) {
        return;
      }
      await this.seeder.seed(command.fileId, command.infoHash);
      return;
    }

    if (!this.seeder.isSeeding(command.fileId)) {
      return;
    }
    await this.seeder.drop(command.fileId);
  }
}
