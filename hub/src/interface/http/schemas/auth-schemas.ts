import { z } from "zod";

export const credentialsSchema = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});
