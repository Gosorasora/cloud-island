import { NextRequest, NextResponse } from "next/server";
import { MOCK_ISLAND_DATA, generateRandomIslandData } from "@/lib/mock-data";

/**
 * GET /api/island?accountId=xxx
 *
 * In production: proxy to AWS API Gateway → DynamoDB aggregation data.
 * Currently: returns mock data for frontend development.
 */
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId parameter is required" },
      { status: 400 }
    );
  }

  // Validate AWS account ID format (12-digit number)
  if (!/^\d{12}$/.test(accountId)) {
    return NextResponse.json(
      { error: "accountId must be a 12-digit number" },
      { status: 400 }
    );
  }

  // TODO: Replace with actual AWS API Gateway proxy call
  // const apiUrl = process.env.AWS_API_GATEWAY_URL;
  // const res = await fetch(`${apiUrl}/island?accountId=${accountId}`);
  // const data = await res.json();

  // For now, return mock data
  const useMockDefault = accountId === "123456789012";
  const data = useMockDefault
    ? MOCK_ISLAND_DATA
    : generateRandomIslandData(accountId);

  return NextResponse.json(data);
}
