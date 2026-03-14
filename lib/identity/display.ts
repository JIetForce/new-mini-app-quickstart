import { type Address, getAddress, isAddress } from "viem";

export interface IdentityDisplaySource {
  address: string | null | undefined;
  basename?: string | null;
  displayName?: string | null;
  username?: string | null;
}

export interface IdentityPresentation {
  primary: string;
  secondary: string | null;
  fullAddress: string | null;
  shortAddress: string | null;
  avatarFallback: string;
}

function trimToNull(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeIdentityAddress(
  value: string | null | undefined,
): Address | null {
  if (!value || !isAddress(value)) {
    return null;
  }

  return getAddress(value);
}

export function shortenIdentityAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isTransactionHash(
  value: string | null | undefined,
): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value.trim());
}

export function buildBaseScanTxUrl(
  value: string | null | undefined,
): string | null {
  if (!isTransactionHash(value)) {
    return null;
  }

  return `https://basescan.org/tx/${value}`;
}

export function getIdentityPresentation(
  source: IdentityDisplaySource,
): IdentityPresentation {
  const address = normalizeIdentityAddress(source.address);
  const shortAddress = address ? shortenIdentityAddress(address) : null;
  const basename = trimToNull(source.basename);
  const displayName = trimToNull(source.displayName);
  const username = trimToNull(source.username);
  const primary =
    basename ??
    displayName ??
    (username ? `@${username}` : null) ??
    shortAddress ??
    "Unknown";
  const secondary =
    primary === shortAddress || !shortAddress ? null : shortAddress;
  const fallbackSource =
    basename?.[0] ??
    displayName?.[0] ??
    username?.[0] ??
    shortAddress?.[2] ??
    "P";

  return {
    primary,
    secondary,
    fullAddress: address,
    shortAddress,
    avatarFallback: fallbackSource.toUpperCase(),
  };
}
