import { z } from "zod";

export const heartbeatSchema = z.object({
  networkId: z.string().min(1),
  peerId: z.string().min(1),
});
