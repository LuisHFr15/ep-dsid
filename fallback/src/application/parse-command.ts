import { z } from "zod";
import { FallbackCommand } from "../domain/command";

const schema = z.discriminatedUnion("cmd", [
  z.object({
    cmd: z.literal("JOIN"),
    networkId: z.string().min(1),
    fileId: z.string().min(1),
    infoHash: z.string().min(1),
  }),
  z.object({
    cmd: z.literal("LEAVE"),
    networkId: z.string().min(1),
    fileId: z.string().min(1),
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
