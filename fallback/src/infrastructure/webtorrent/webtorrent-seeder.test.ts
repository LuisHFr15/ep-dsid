import { describe, it, expect } from "vitest";
import { WebTorrentSeeder } from "./webtorrent-seeder";

// Defesa em profundidade: mesmo que uma mensagem com fileId inválido passasse
// pela validação, o seeder recusa qualquer caminho que escape do seedDir antes
// de fazer o rm recursivo. drop() aplica o guard antes de tocar o filesystem.
describe("WebTorrentSeeder containment", () => {
  const seedDir = "/var/lib/ep-dsid/seed";

  it("refuses to drop a fileId that escapes the seedDir", async () => {
    const seeder = new WebTorrentSeeder(seedDir);
    await expect(seeder.drop("../../../etc")).rejects.toThrow(/escapa do diretório de seed/);
  });

  it("refuses to drop an empty fileId (would target the seedDir itself)", async () => {
    const seeder = new WebTorrentSeeder(seedDir);
    await expect(seeder.drop("")).rejects.toThrow(/seedDir/);
  });

  it("refuses to drop an absolute path outside the seedDir", async () => {
    const seeder = new WebTorrentSeeder(seedDir);
    await expect(seeder.drop("/etc/passwd")).rejects.toThrow(/escapa do diretório de seed/);
  });
});
