import { NextRequest, NextResponse } from "next/server";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import {
  CloudTrailClient,
  LookupEventsCommand,
} from "@aws-sdk/client-cloudtrail";
import { categorizeService } from "@/lib/aws-categories";
import type { IslandData, CategoryActivity } from "@/lib/cloud-island";

const EXTERNAL_ID = "celesta-local-test";
const REGION = process.env.AWS_REGION || "ap-northeast-2";

/**
 * POST /api/sync
 * Body: { roleArn: string }
 *
 * AssumeRole → CloudTrail LookupEvents → categorize → return IslandData
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roleArn } = body as { roleArn?: string };

    if (!roleArn || !roleArn.startsWith("arn:aws:iam::")) {
      return NextResponse.json(
        { error: "Valid Role ARN is required (arn:aws:iam::...)" },
        { status: 400 }
      );
    }

    // Extract account ID from ARN
    const accountId = roleArn.split(":")[4];

    // 1. AssumeRole
    const stsClient = new STSClient({ region: REGION });
    const assumeResult = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: "celesta-sync",
        ExternalId: EXTERNAL_ID,
        DurationSeconds: 900,
      })
    );

    const credentials = assumeResult.Credentials;
    if (!credentials) {
      return NextResponse.json(
        { error: "Failed to assume role — no credentials returned" },
        { status: 500 }
      );
    }

    // 2. CloudTrail LookupEvents with assumed credentials
    const ctClient = new CloudTrailClient({
      region: REGION,
      credentials: {
        accessKeyId: credentials.AccessKeyId!,
        secretAccessKey: credentials.SecretAccessKey!,
        sessionToken: credentials.SessionToken!,
      },
    });

    // Fetch up to 3 pages (150 events max, LookupEvents rate limit: 2/min)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const allEvents: {
      eventSource: string;
      eventName: string;
      errorCode?: string;
      username?: string;
    }[] = [];

    let nextToken: string | undefined;
    for (let page = 0; page < 3; page++) {
      const result = await ctClient.send(
        new LookupEventsCommand({
          StartTime: weekAgo,
          EndTime: now,
          MaxResults: 50,
          NextToken: nextToken,
        })
      );

      for (const event of result.Events ?? []) {
        allEvents.push({
          eventSource: event.EventSource ?? "unknown",
          eventName: event.EventName ?? "unknown",
          errorCode: event.CloudTrailEvent
            ? (() => {
                try {
                  const parsed = JSON.parse(event.CloudTrailEvent);
                  return parsed.errorCode;
                } catch {
                  return undefined;
                }
              })()
            : undefined,
          username: event.Username ?? "unknown",
        });
      }

      nextToken = result.NextToken;
      if (!nextToken) break;
    }

    // 3. Categorize and aggregate
    const categoryMap = new Map<
      string,
      {
        apiCallCount: number;
        errorCount: number;
        services: Map<string, number>;
        principals: Map<string, number>;
      }
    >();

    // Initialize all 7 categories
    for (const catId of [
      "compute",
      "storage",
      "database",
      "networking",
      "security",
      "management",
      "aiml",
    ]) {
      categoryMap.set(catId, {
        apiCallCount: 0,
        errorCount: 0,
        services: new Map(),
        principals: new Map(),
      });
    }

    for (const event of allEvents) {
      const catId = categorizeService(event.eventSource);
      const cat = categoryMap.get(catId)!;

      cat.apiCallCount++;
      if (event.errorCode) cat.errorCount++;

      cat.services.set(
        event.eventSource,
        (cat.services.get(event.eventSource) ?? 0) + 1
      );
      cat.principals.set(
        event.username ?? "unknown",
        (cat.principals.get(event.username ?? "unknown") ?? 0) + 1
      );
    }

    // 4. Build IslandData
    let totalApiCalls = 0;
    let totalErrors = 0;
    const categories: CategoryActivity[] = [];

    for (const [catId, data] of categoryMap) {
      totalApiCalls += data.apiCallCount;
      totalErrors += data.errorCount;

      const topServices = Array.from(data.services.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([service, count]) => ({ service, count }));

      const principals = Array.from(data.principals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([principal, count]) => ({ principal, count }));

      categories.push({
        categoryId: catId,
        apiCallCount: data.apiCallCount,
        errorCount: data.errorCount,
        resourceCount: topServices.length,
        topServices,
        principals,
      });
    }

    const islandData: IslandData = {
      accountId,
      dateRange: {
        start: weekAgo.toISOString(),
        end: now.toISOString(),
      },
      categories,
      totalApiCalls,
      totalErrors,
    };

    return NextResponse.json(islandData);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during sync";
    console.error("Sync error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
