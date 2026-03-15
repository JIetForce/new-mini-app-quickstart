import { NextRequest, NextResponse } from "next/server";

type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

declare global {
  var __payLinkRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

function getRateLimitStore(): Map<string, RateLimitBucket> {
  if (!globalThis.__payLinkRateLimitStore) {
    globalThis.__payLinkRateLimitStore = new Map<string, RateLimitBucket>();
  }

  return globalThis.__payLinkRateLimitStore;
}

function pruneStore(now: number, store: Map<string, RateLimitBucket>): void {
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-vercel-forwarded-for") ??
    "unknown"
  );
}

export function checkRateLimit(
  request: NextRequest,
  rule: RateLimitRule,
  suffix = "",
): RateLimitResult {
  const now = Date.now();
  const store = getRateLimitStore();

  pruneStore(now, store);

  const key = `${rule.key}:${getClientIp(request)}${suffix ? `:${suffix}` : ""}`;
  const existingBucket = store.get(key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + rule.windowMs,
    });

    return {
      allowed: true,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - 1),
      resetAt: now + rule.windowMs,
      retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
    };
  }

  if (existingBucket.count >= rule.limit) {
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      resetAt: existingBucket.resetAt,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existingBucket.resetAt - now) / 1000),
      ),
    };
  }

  existingBucket.count += 1;
  store.set(key, existingBucket);

  return {
    allowed: true,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - existingBucket.count),
    resetAt: existingBucket.resetAt,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((existingBucket.resetAt - now) / 1000),
    ),
  };
}

export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): void {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(result.resetAt / 1000)),
  );
}

export function buildRateLimitResponse(
  message: string,
  result: RateLimitResult,
): NextResponse {
  const response = NextResponse.json(
    {
      code: "rate_limited",
      message,
    },
    { status: 429 },
  );

  applyRateLimitHeaders(response, result);
  response.headers.set("Retry-After", String(result.retryAfterSeconds));

  return response;
}
