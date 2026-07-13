import { FallbackCommand } from "../domain/command";
import { SeedStateStore } from "./ports/seed-state-store";
import { TorrentSeeder } from "./ports/torrent-seeder";

export class ProcessCommand {
  constructor(
    private readonly state: SeedStateStore,
    private readonly seeder: TorrentSeeder,
  ) {}

  async execute(command: FallbackCommand): Promise<void> {
    if (command.cmd === "JOIN") {
      if (this.seeder.isSeeding(command.fileId)) {
        return;
      }
      // Write-ahead: registra o estado desejado ANTES de semear, para que um
      // crash entre os dois seja recuperado pelo restore no proximo boot.
      await this.state.add({
        networkId: command.networkId,
        fileId: command.fileId,
        infoHash: command.infoHash,
      });
      await this.seeder.seed(command.fileId, command.infoHash);
      return;
    }

    // LEAVE: remove o estado desejado primeiro (o "nao quero mais" duravel),
    // depois para de semear se estiver ativo.
    await this.state.remove(command.fileId);
    if (this.seeder.isSeeding(command.fileId)) {
      await this.seeder.drop(command.fileId);
    }
  }
}
