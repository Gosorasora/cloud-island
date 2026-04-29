import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { IslandData, SavedIslandSummary } from "./cloud-island";

const TABLE_NAME = process.env.SNAPSHOT_TABLE_NAME;
const REGION = process.env.AWS_REGION || "ap-northeast-2";
const LATEST_SNAPSHOT_KEY = "LATEST";

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION })
);

interface SnapshotItem {
  accountId: string;
  snapshotAt: string;
  data: IslandData;
  label?: string;
  roleArn?: string;
  latestSnapshotAt?: string;
}

function requireTableName(): string {
  if (!TABLE_NAME) {
    throw new Error("SNAPSHOT_TABLE_NAME is not configured");
  }

  return TABLE_NAME;
}

export async function saveIslandSnapshot(
  data: IslandData,
  metadata: { label: string; roleArn: string }
): Promise<string> {
  const snapshotAt = new Date().toISOString();
  const tableName = requireTableName();

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        accountId: data.accountId,
        snapshotAt,
        data,
      } satisfies SnapshotItem,
    })
  );

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        accountId: data.accountId,
        snapshotAt: LATEST_SNAPSHOT_KEY,
        latestSnapshotAt: snapshotAt,
        label: metadata.label,
        roleArn: metadata.roleArn,
        data,
      } satisfies SnapshotItem,
    })
  );

  return snapshotAt;
}

export async function getLatestIslandSnapshot(
  accountId: string
): Promise<IslandData | null> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: requireTableName(),
      KeyConditionExpression: "accountId = :accountId",
      ExpressionAttributeValues: {
        ":accountId": accountId,
      },
      ScanIndexForward: false,
      Limit: 1,
    })
  );

  const item = result.Items?.[0] as SnapshotItem | undefined;
  return item?.data ?? null;
}

export async function listSavedIslands(): Promise<SavedIslandSummary[]> {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: requireTableName(),
      FilterExpression: "snapshotAt = :snapshotAt",
      ExpressionAttributeValues: {
        ":snapshotAt": LATEST_SNAPSHOT_KEY,
      },
    })
  );

  return (result.Items as SnapshotItem[] | undefined)
    ?.filter(
      (item): item is SnapshotItem & { label: string; roleArn: string } =>
        Boolean(item.label && item.roleArn)
    )
    .map((item) => ({
      accountId: item.accountId,
      label: item.label,
      roleArn: item.roleArn,
      snapshotAt: item.latestSnapshotAt ?? item.snapshotAt,
      data: item.data,
    }))
    .sort((left, right) => right.snapshotAt.localeCompare(left.snapshotAt)) ?? [];
}
