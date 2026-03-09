import "server-only";

import { getAppUrl } from "@/lib/env";
import {
  SupabaseRequestError,
  supabaseAdminRequest,
} from "@/lib/supabase/server";
import {
  type ConfirmPaymentLinkInput,
  type CreatePaymentLinkInput,
  type PaymentAttemptRecord,
  type PaymentAttemptStatus,
  type PaymentLinkRecord,
  type PaymentLinkStatus,
  createPaymentLinkSlug,
  isPaymentLinkExpired,
  normalizeAddress,
  parseConfirmPaymentLinkInput,
  parseCreatePaymentLinkInput,
} from "./shared";

export class PaymentLinkServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PaymentLinkServiceError";
  }
}

function buildQuery(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function fetchPaymentLinkBySlug(
  slug: string,
): Promise<PaymentLinkRecord | null> {
  const rows = await supabaseAdminRequest<PaymentLinkRecord[]>(
    `/payment_links?${buildQuery({
      select: "*",
      slug: `eq.${slug}`,
      limit: "1",
    })}`,
  );

  return rows[0] ?? null;
}

async function syncExpiredPaymentLink(
  link: PaymentLinkRecord,
): Promise<PaymentLinkRecord> {
  if (link.status === "active" && isPaymentLinkExpired(link)) {
    return updatePaymentLink(link.id, { status: "expired" });
  }

  return link;
}

async function updatePaymentLink(
  id: string,
  patch: Partial<PaymentLinkRecord>,
): Promise<PaymentLinkRecord> {
  const rows = await supabaseAdminRequest<PaymentLinkRecord[]>(
    `/payment_links?${buildQuery({
      select: "*",
      id: `eq.${id}`,
    })}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
    },
  );

  const link = rows[0];

  if (!link) {
    throw new PaymentLinkServiceError("Payment link not found.", 404);
  }

  return link;
}

async function fetchPaymentAttempt(
  paymentLinkId: string,
  paymentId: string,
): Promise<PaymentAttemptRecord | null> {
  const rows = await supabaseAdminRequest<PaymentAttemptRecord[]>(
    `/payment_attempts?${buildQuery({
      select: "*",
      payment_link_id: `eq.${paymentLinkId}`,
      payment_id: `eq.${paymentId}`,
      limit: "1",
    })}`,
  );

  return rows[0] ?? null;
}

async function insertPaymentAttempt(
  paymentLinkId: string,
  paymentId: string,
  status: PaymentAttemptStatus,
): Promise<PaymentAttemptRecord> {
  const now = new Date().toISOString();
  const rows = await supabaseAdminRequest<PaymentAttemptRecord[]>(
    "/payment_attempts",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        payment_link_id: paymentLinkId,
        payment_id: paymentId,
        status,
        created_at: now,
        updated_at: now,
      }),
    },
  );

  const attempt = rows[0];

  if (!attempt) {
    throw new Error("Supabase did not return the created payment attempt.");
  }

  return attempt;
}

async function updatePaymentAttempt(
  id: string,
  status: PaymentAttemptStatus,
): Promise<PaymentAttemptRecord> {
  const rows = await supabaseAdminRequest<PaymentAttemptRecord[]>(
    `/payment_attempts?${buildQuery({
      select: "*",
      id: `eq.${id}`,
    })}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  const attempt = rows[0];

  if (!attempt) {
    throw new Error("Payment attempt not found.");
  }

  return attempt;
}

function normalizeCreateInput(value: unknown): CreatePaymentLinkInput {
  try {
    return parseCreatePaymentLinkInput(value);
  } catch (error) {
    throw new PaymentLinkServiceError(
      error instanceof Error ? error.message : "Invalid payment link payload.",
      400,
    );
  }
}

function normalizeConfirmInput(value: unknown): ConfirmPaymentLinkInput {
  try {
    return parseConfirmPaymentLinkInput(value);
  } catch (error) {
    throw new PaymentLinkServiceError(
      error instanceof Error
        ? error.message
        : "Invalid payment confirmation payload.",
      400,
    );
  }
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof SupabaseRequestError && error.status === 409;
}

export async function getPaymentLinkBySlug(
  slug: string,
  options: { syncExpired?: boolean } = {},
): Promise<PaymentLinkRecord | null> {
  const link = await fetchPaymentLinkBySlug(slug);

  if (!link) {
    return null;
  }

  if (
    options.syncExpired &&
    link.status === "active" &&
    isPaymentLinkExpired(link)
  ) {
    return updatePaymentLink(link.id, { status: "expired" });
  }

  return link;
}

export async function createPaymentLink(
  value: unknown,
): Promise<PaymentLinkRecord> {
  const input = normalizeCreateInput(value);
  const createdAt = new Date().toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = createPaymentLinkSlug();

    if (await fetchPaymentLinkBySlug(slug)) {
      continue;
    }

    try {
      const rows = await supabaseAdminRequest<PaymentLinkRecord[]>(
        "/payment_links",
        {
          method: "POST",
          headers: {
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            slug,
            creator_address: input.creatorAddress,
            creator_fid: input.creatorFid,
            creator_username: input.creatorUsername,
            creator_display_name: input.creatorDisplayName,
            creator_pfp_url: input.creatorPfpUrl,
            recipient_address: input.recipientAddress,
            amount_usdc: Number(input.amountUsdc),
            title: input.title,
            note: input.note,
            status: "active",
            expires_at: input.expiresAt,
            created_at: createdAt,
          }),
        },
      );

      const link = rows[0];

      if (!link) {
        throw new Error("Supabase did not return the created payment link.");
      }

      return link;
    } catch (error) {
      if (isUniqueConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new PaymentLinkServiceError(
    "Unable to create a unique payment link right now.",
    500,
  );
}

export async function confirmPaymentLink(
  slug: string,
  value: unknown,
): Promise<{ link: PaymentLinkRecord; attempt: PaymentAttemptRecord }> {
  const input = normalizeConfirmInput(value);
  const link = await getPaymentLinkBySlug(slug, { syncExpired: true });

  if (!link) {
    throw new PaymentLinkServiceError("Payment link not found.", 404);
  }

  if (link.status === "paid" && link.payment_id && link.payment_id !== input.paymentId) {
    throw new PaymentLinkServiceError(
      "This payment link has already been paid.",
      409,
    );
  }

  const existingAttempt = await fetchPaymentAttempt(link.id, input.paymentId);
  const effectiveStatus =
    existingAttempt?.status === "completed" ||
    (link.status === "paid" && link.payment_id === input.paymentId)
      ? "completed"
      : input.status;

  const attempt = existingAttempt
    ? await updatePaymentAttempt(existingAttempt.id, effectiveStatus)
    : await insertPaymentAttempt(link.id, input.paymentId, effectiveStatus);

  if (effectiveStatus === "completed") {
    const paidLink =
      link.status === "paid" && link.payment_id === input.paymentId
        ? link
        : await updatePaymentLink(link.id, {
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_id: input.paymentId,
            payer_address: input.payerAddress,
          });

    return {
      link: paidLink,
      attempt,
    };
  }

  if (link.status === "active" && isPaymentLinkExpired(link)) {
    return {
      link: await updatePaymentLink(link.id, { status: "expired" }),
      attempt,
    };
  }

  return {
    link,
    attempt,
  };
}

export function buildPaymentLinkUrl(slug: string): string {
  return new URL(`/r/${slug}`, getAppUrl()).toString();
}

export async function getCreatorPaymentLinks(options: {
  creatorAddress: string;
  page: number;
  pageSize?: number;
  status?: PaymentLinkStatus;
}): Promise<{
  links: PaymentLinkRecord[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}> {
  const creatorAddress = normalizeAddress(
    options.creatorAddress,
    "Creator address",
  );
  const page = Number.isInteger(options.page) && options.page > 0 ? options.page : 1;
  const pageSize =
    Number.isInteger(options.pageSize) && options.pageSize && options.pageSize > 0
      ? Math.min(options.pageSize, 25)
      : 10;

  const params: Record<string, string> = {
    select: "*",
    creator_address: `eq.${creatorAddress}`,
    order: "created_at.desc",
    offset: String((page - 1) * pageSize),
    limit: String(pageSize + 1),
  };

  if (options.status) {
    params.status = `eq.${options.status}`;
  }

  const rows = await supabaseAdminRequest<PaymentLinkRecord[]>(
    `/payment_links?${buildQuery(params)}`,
  );
  const normalizedRows = await Promise.all(rows.map(syncExpiredPaymentLink));

  return {
    links: normalizedRows.slice(0, pageSize),
    page,
    pageSize,
    hasNextPage: normalizedRows.length > pageSize,
  };
}
