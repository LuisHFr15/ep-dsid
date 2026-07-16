import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SeedEntry, SeedStateStore } from "../../application/ports/seed-state-store";

export class FileSeedStateStore implements SeedStateStore {
  private readonly filePath: string;

  constructor(
    seedDir: string,
    private readonly log: (message: string, err?: unknown) => void = () => {},
  ) {
    this.filePath = join(seedDir, "seed-state.json");
  }

  async add(entry: SeedEntry): Promise<void> {
    const entries = await this.list();
    const next = entries.filter((e) => e.fileId !== entry.fileId);
    next.push(entry);
    await this.write(next);
  }

  async remove(fileId: string): Promise<void> {
    const entries = await this.list();
    const next = entries.filter((e) => e.fileId !== fileId);
    if (next.length !== entries.length) {
      await this.write(next);
    }
  }

  async list(): Promise<SeedEntry[]> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SeedEntry[]) : [];
    } catch (err) {
      this.log(`ignoring corrupt seed state at ${this.filePath}`, err);
      return [];
    }
  }

  private async write(entries: SeedEntry[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(entries, null, 2), "utf8");
    await rename(tmp, this.filePath);
  }
}
