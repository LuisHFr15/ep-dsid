import { z } from "zod";
import { FallbackCommand } from "../domain/command";

// networkId/fileId são gerados pelo hub com randomUUID; infoHash é o btih do
// WebTorrent (40 hex para v1, 64 para v2). Validar o formato aqui evita que uma
// mensagem forjada leve o worker a escrever/apagar fora do seedDir (fileId vira
// segmento de path) ou a buscar conteúdo arbitrário (infoHash vira URL/arquivo).
const uuid = z.string().uuid();
const infoHash = z.string().regex(/^[a-f0-9]{40}$|^[a-f0-9]{64}$/i);
// Magnet opcional: aceitamos apenas magnet URIs (usados para achar peers via
// trackers). Qualquer outro valor é rejeitado para não virar URL/arquivo
// arbitrário no client.add. Ausente/null é tolerado (cai no infoHash).
const magnet = z.string().regex(/^magnet:\?/i).nullish();

const schema = z.discriminatedUnion("cmd", [
  z.object({
    cmd: z.literal("JOIN"),
    networkId: uuid,
    fileId: uuid,
    infoHash,
    magnet,
  }),
  z.object({
    cmd: z.literal("LEAVE"),
    networkId: uuid,
    fileId: uuid,
  }),
]);

export function parseCommand(raw: string): FallbackCommand {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("invalid command: not valid JSON");
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`invalid command: ${detail}`);
  }

  return result.data;
}
