import "dotenv/config";
import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import { loadConfig } from "../src/infrastructure/config/env";

async function main() {
  const config = loadConfig();
  const client = new DynamoDBClient({
    region: config.aws.region,
    ...(config.aws.dynamoEndpoint
        ? {
          endpoint: config.aws.dynamoEndpoint,
          credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" }
        }
        : {}),
  });

  try {
    await client.send(
      new CreateTableCommand({
        TableName: config.aws.dynamoTable,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" },
          { AttributeName: "gsi1pk", AttributeType: "S" },
          { AttributeName: "gsi1sk", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "gsi1",
            KeySchema: [
              { AttributeName: "gsi1pk", KeyType: "HASH" },
              { AttributeName: "gsi1sk", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
      }),
    );
    console.log(`created table ${config.aws.dynamoTable}`);
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`table ${config.aws.dynamoTable} already exists`);
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
