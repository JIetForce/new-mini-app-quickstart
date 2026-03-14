"use client";

import { useEffect, useMemo, useState } from "react";
import { type Address } from "viem";

import { normalizeIdentityAddress } from "./display";

const resolvedNameCache = new Map<string, string | null>();

type ResolveIdentityResponse = {
  names?: Record<string, string | null>;
  message?: string;
};

function getCachedNames(
  addresses: readonly Address[],
): Record<string, string | null> {
  return Object.fromEntries(
    addresses
      .filter((address) => resolvedNameCache.has(address))
      .map((address) => [address, resolvedNameCache.get(address) ?? null]),
  );
}

function mergeNames(
  current: Record<string, string | null>,
  patch: Record<string, string | null>,
): Record<string, string | null> {
  let changed = false;
  const next = { ...current };

  for (const [address, name] of Object.entries(patch)) {
    if (next[address] !== name) {
      next[address] = name;
      changed = true;
    }
  }

  return changed ? next : current;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export function useResolvedNames(
  addresses: readonly (string | null | undefined)[],
): {
  isLoading: boolean;
  names: Record<string, string | null>;
} {
  const normalizedAddressKey = [...new Set(addresses)]
    .map((address) => normalizeIdentityAddress(address))
    .filter((address): address is Address => Boolean(address))
    .join("|");
  const normalizedAddresses = useMemo(
    () =>
      normalizedAddressKey
        ? (normalizedAddressKey.split("|") as Address[])
        : [],
    [normalizedAddressKey],
  );
  const [names, setNames] = useState<Record<string, string | null>>(() =>
    getCachedNames(normalizedAddresses),
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cachedNames = getCachedNames(normalizedAddresses);
    const missingAddresses = normalizedAddresses.filter(
      (address) => !resolvedNameCache.has(address),
    );

    setNames((current) => mergeNames(current, cachedNames));

    if (missingAddresses.length === 0) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);

    void (async () => {
      try {
        const response = await fetch("/api/identity/resolve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            addresses: missingAddresses,
          }),
          cache: "no-store",
        });
        const payload = await readJsonResponse<ResolveIdentityResponse>(response);

        const resolvedNames = payload.names;

        if (!response.ok || !resolvedNames) {
          throw new Error(payload.message || "Unable to resolve Base names.");
        }

        for (const [address, name] of Object.entries(resolvedNames)) {
          resolvedNameCache.set(address, name ?? null);
        }

        if (!cancelled) {
          setNames((current) => mergeNames(current, resolvedNames));
        }
      } catch {
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedAddresses]);

  return {
    isLoading,
    names,
  };
}
