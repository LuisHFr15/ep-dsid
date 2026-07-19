import { SeedStateStore } from "./ports/seed-state-store";
import { TorrentSeeder } from "./ports/torrent-seeder";

// Re-semeia, no boot, o conjunto que o fallback deveria estar servindo.
// Fecha o furo de um restart do fallback sem depender de o hub reenviar JOIN.
// Nao-bloqueante: uma falha por item loga e segue; o worker sobe de qualquer forma.
export async function restoreSeeding(
  state: SeedStateStore,
  seeder: TorrentSeeder,
  log: (message: string, err?: unknown) => void = () => {},
): Promise<number> {
  const entries = await state.list();
  let restored = 0;

  for (const entry of entries) {
    if (seeder.isSeeding(entry.fileId)) {
      continue;
    }
    try {
      await seeder.seed(entry.fileId, entry.infoHash, entry.magnet);
      restored++;
    } catch (err) {
      log(`failed to restore seeding for ${entry.fileId}`, err);
    }
  }

  log(`restored ${restored}/${entries.length} seeded files`);
  return restored;
}
