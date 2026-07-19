import { FallbackCommand } from "../domain/command";
import { SeedStateStore } from "./ports/seed-state-store";
import { TorrentSeeder } from "./ports/torrent-seeder";

export class ProcessCommand {
  constructor(
    private readonly state: SeedStateStore,
    private readonly seeder: TorrentSeeder,
    private readonly log: (message: string, err?: unknown) => void = () => {},
  ) {}

  async execute(command: FallbackCommand): Promise<void> {
    if (command.cmd === "JOIN") {
      if (this.seeder.isSeeding(command.fileId)) {
        this.log(
          `[fallback] JOIN ignorado (já semeando) — rede=${command.networkId} arquivo=${command.fileId}`,
        );
        return;
      }
      this.log(
        `[fallback] JOIN — entrando na rede=${command.networkId} arquivo=${command.fileId} infoHash=${command.infoHash} — começando a semear`,
      );
      // Write-ahead: registra o estado desejado ANTES de semear, para que um
      // crash entre os dois seja recuperado pelo restore no proximo boot.
      await this.state.add({
        networkId: command.networkId,
        fileId: command.fileId,
        infoHash: command.infoHash,
        magnet: command.magnet,
      });
      await this.seeder.seed(command.fileId, command.infoHash, command.magnet);
      this.log(
        `[fallback] JOIN concluído — agora semeando rede=${command.networkId} arquivo=${command.fileId}`,
      );
      return;
    }

    // LEAVE: remove o estado desejado primeiro (o "nao quero mais" duravel),
    // depois para de semear se estiver ativo.
    await this.state.remove(command.fileId);
    if (this.seeder.isSeeding(command.fileId)) {
      this.log(
        `[fallback] LEAVE — saindo da rede=${command.networkId} arquivo=${command.fileId} — parando de semear`,
      );
      await this.seeder.drop(command.fileId);
      this.log(
        `[fallback] LEAVE concluído — rede=${command.networkId} arquivo=${command.fileId} removido do disco`,
      );
    } else {
      this.log(
        `[fallback] LEAVE ignorado (não estava semeando) — rede=${command.networkId} arquivo=${command.fileId}`,
      );
    }
  }
}
