import "server-only";

import { getRequiredEnv } from "@/lib/env";

type SupabaseErrorPayload = {
  code?: string;
  details?: string;
  error?: string;
  hint?: string;
  message?: string;
};

export class SupabaseRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload?: SupabaseErrorPayload | string | null,
  ) {
    super(message);
    this.name = "SupabaseRequestError";
  }
}

const SUPABASE_URL = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SECRET_KEY = getRequiredEnv("SUPABASE_SECRET_KEY");
const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;

function buildSupabaseUrl(path: string): string {
  return `${SUPABASE_REST_URL}${path}`;
}

async function parseResponseBody(
  response: Response,
): Promise<SupabaseErrorPayload | string | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as SupabaseErrorPayload;
  } catch {
    return text;
  }
}

async function parseSuccessBody<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export async function supabaseAdminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(buildSupabaseUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await parseResponseBody(response);
    const message =
      (typeof payload === "object" && payload?.message) ||
      (typeof payload === "object" && payload?.error) ||
      (typeof payload === "string" ? payload : "Supabase request failed.");

    throw new SupabaseRequestError(message, response.status, payload);
  }

  return parseSuccessBody<T>(response);
}
