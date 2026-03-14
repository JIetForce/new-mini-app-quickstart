import "server-only";

import { type Address, createPublicClient, http } from "viem";
import { toCoinType } from "viem/ens";
import { base, mainnet } from "viem/chains";

import { getOptionalEnv } from "@/lib/env";

import { normalizeIdentityAddress } from "./display";

const basenameClient = createPublicClient({
  chain: mainnet,
  transport: http(getOptionalEnv("BASENAME_RPC_URL")),
});

const baseCoinType = toCoinType(base.id);

export async function resolveBasename(
  address: string | null | undefined,
): Promise<string | null> {
  const normalizedAddress = normalizeIdentityAddress(address);

  if (!normalizedAddress) {
    return null;
  }

  try {
    const basename = await basenameClient.getEnsName({
      address: normalizedAddress,
      coinType: baseCoinType,
    });

    return typeof basename === "string" && basename.trim() ? basename : null;
  } catch {
    return null;
  }
}

export async function resolveBasenames(
  addresses: readonly (string | null | undefined)[],
): Promise<Record<string, string | null>> {
  const uniqueAddresses = [...new Set(addresses)]
    .map((address) => normalizeIdentityAddress(address))
    .filter((address): address is Address => Boolean(address));

  const results = await Promise.all(
    uniqueAddresses.map(async (address) => [address, await resolveBasename(address)]),
  );

  return Object.fromEntries(results);
}
