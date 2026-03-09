"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";

import type {
  PaymentLinkStatus,
  PublicPaymentLink,
} from "@/lib/payment-links/shared";

import styles from "../page.module.css";

type StatusFilter = "all" | PaymentLinkStatus;

interface MyLinksResponse {
  links: PublicPaymentLink[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  status: PaymentLinkStatus | null;
}

function formatAmount(amountUsdc: string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(Number(amountUsdc));
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

export default function MyLinksPage() {
  const { address } = useAccount();
  const [links, setLinks] = useState<PublicPaymentLink[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!address) {
      setLinks([]);
      return;
    }

    setIsLoading(true);
    setError("");

    const params = new URLSearchParams({
      creatorAddress: address,
      page: String(page),
      pageSize: "10",
    });

    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    void fetch(`/api/my-links?${params.toString()}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as MyLinksResponse & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message || "Unable to load your links.");
        }

        setLinks(payload.links);
        setHasNextPage(payload.hasNextPage);
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your links.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [address, page, statusFilter]);

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>My links</p>
          <h1 className={styles.title}>Your created payment links</h1>
          <p className={styles.subtitle}>
            Links are currently looked up by `creator_address`. For Base Account
            autofill and creator lookup, test from Base Preview or the Base app
            using a public HTTPS URL.
          </p>
        </div>

        <div className={styles.filtersRow}>
          <label className={styles.field}>
            <span className={styles.label}>Status</span>
            <select
              className={styles.input}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              value={statusFilter}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
              <option value="expired">Expired</option>
              <option value="canceled">Canceled</option>
            </select>
          </label>

          <div className={styles.actions}>
            <Link className={styles.secondaryButton} href="/">
              Home
            </Link>
            <Link className={styles.primaryButton} href="/create">
              Create link
            </Link>
          </div>
        </div>

        {!address ? (
          <p className={styles.helper}>
            No creator address is available in this browser session yet.
          </p>
        ) : null}

        {error ? <p className={styles.errorText}>{error}</p> : null}

        <div className={styles.linksList}>
          {isLoading ? <p className={styles.helper}>Loading...</p> : null}

          {!isLoading && address && links.length === 0 ? (
            <p className={styles.helper}>No links found for this creator yet.</p>
          ) : null}

          {links.map((link) => (
            <Link className={styles.linkCard} href={`/r/${link.slug}`} key={link.id}>
              <div className={styles.linkCardHeader}>
                <strong className={styles.summaryValue}>
                  {link.title || `${formatAmount(link.amountUsdc)} USDC`}
                </strong>
                <span className={`${styles.statusPill} ${styles[`status${link.status}`]}`}>
                  {link.status}
                </span>
              </div>
              <div className={styles.linkMetaGrid}>
                <span>Amount: ${formatAmount(link.amountUsdc)} USDC</span>
                <span>Recipient: {link.recipientAddress}</span>
                <span>Created: {formatDate(link.createdAt)}</span>
                <span>Paid: {formatDate(link.paidAt)}</span>
              </div>
            </Link>
          ))}
        </div>

        {address ? (
          <div className={styles.actions}>
            <button
              className={styles.ghostButton}
              disabled={page === 1 || isLoading}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              type="button"
            >
              Previous
            </button>
            <span className={styles.helper}>Page {page}</span>
            <button
              className={styles.ghostButton}
              disabled={!hasNextPage || isLoading}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
