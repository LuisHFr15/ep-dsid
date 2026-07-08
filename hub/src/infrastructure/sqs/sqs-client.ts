import { SQSClient } from "@aws-sdk/client-sqs";
import { Config } from "../config/env";

export function createSqsClient(config: Config): SQSClient {
  return new SQSClient({ region: config.aws.region });
}
