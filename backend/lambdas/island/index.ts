import { getIslandDataByAccountId } from "../../../src/shared/cloud/island-service";
import {
  getLatestIslandSnapshot,
  listSavedIslands,
} from "../../../src/shared/cloud/snapshot-store";

interface ApiGatewayEvent {
  queryStringParameters?: Record<string, string | undefined> | null;
  rawPath?: string;
}

interface ApiGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

function response(statusCode: number, body: unknown): ApiGatewayResponse {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export async function handler(
  event: ApiGatewayEvent
): Promise<ApiGatewayResponse> {
  if (event.rawPath?.endsWith("/islands")) {
    const islands = await listSavedIslands();
    return response(200, { islands });
  }

  const accountId = event.queryStringParameters?.accountId;

  if (!accountId) {
    return response(400, { error: "accountId parameter is required" });
  }

  if (!/^\d{12}$/.test(accountId)) {
    return response(400, { error: "accountId must be a 12-digit number" });
  }

  const latestSnapshot = await getLatestIslandSnapshot(accountId);
  return response(200, latestSnapshot ?? getIslandDataByAccountId(accountId));
}
