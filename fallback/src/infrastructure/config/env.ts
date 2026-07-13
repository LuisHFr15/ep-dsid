import { z } from "zod";

const schema = z.object({
  AWS_REGION: z.string().min(1),
  SQS_QUEUE_URL: z.string().url(),
  SQS_WAIT_TIME_SECONDS: z.coerce.number().int().min(0).max(20).default(20),
  SEED_DIR: z.string().min(1).default("./data"),
});

export type Config = {
  aws: {
    region: string;
    sqsQueueUrl: string;
    waitTimeSeconds: number;
  };
  seedDir: string;
};

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`invalid environment configuration:\n${missing}`);
  }

  const env = parsed.data;
  return {
    aws: {
      region: env.AWS_REGION,
      sqsQueueUrl: env.SQS_QUEUE_URL,
      waitTimeSeconds: env.SQS_WAIT_TIME_SECONDS,
    },
    seedDir: env.SEED_DIR,
  };
}
