import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  AWS_REGION: z.string().min(1),
  DYNAMO_TABLE: z.string().min(1),
  DYNAMO_ENDPOINT: z.string().url().optional().or(z.literal("")),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default("1h"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  SQS_QUEUE_URL: z.string().url().optional().or(z.literal("")),
  FALLBACK_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
});

export type Config = {
  port: number;
  aws: {
    region: string;
    dynamoTable: string;
    dynamoEndpoint?: string;
    sqsQueueUrl?: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  bcryptRounds: number;
  fallbackSweepIntervalMs: number;
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
    port: env.PORT,
    aws: {
      region: env.AWS_REGION,
      dynamoTable: env.DYNAMO_TABLE,
      dynamoEndpoint: env.DYNAMO_ENDPOINT || undefined,
      sqsQueueUrl: env.SQS_QUEUE_URL || undefined,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    bcryptRounds: env.BCRYPT_ROUNDS,
    fallbackSweepIntervalMs: env.FALLBACK_SWEEP_INTERVAL_MS,
  };
}
