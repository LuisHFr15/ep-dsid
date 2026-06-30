import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Config } from "../config/env";

export function createDocumentClient(config: Config): DynamoDBDocumentClient {
  const client = new DynamoDBClient({
    region: config.aws.region,
    ...(config.aws.dynamoEndpoint ? { endpoint: config.aws.dynamoEndpoint } : {}),
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
