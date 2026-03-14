import { getAddress, isAddress } from "viem";

import { getAppUrl, getOptionalEnv } from "./lib/env";

const ROOT_URL = getAppUrl();
const ROOT_DOMAIN = new URL(ROOT_URL).hostname;

function getOptionalBuilderOwnerAddress() {
  const value = getOptionalEnv("BASE_BUILDER_OWNER_ADDRESS");

  if (!value) {
    return undefined;
  }

  if (!isAddress(value)) {
    throw new Error("Invalid BASE_BUILDER_OWNER_ADDRESS");
  }

  return getAddress(value);
}

const BUILDER_OWNER_ADDRESS = getOptionalBuilderOwnerAddress();

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const farcasterConfig = {
  accountAssociation: {
    header:
      "eyJmaWQiOi0xLCJ0eXBlIjoiYXV0aCIsImtleSI6IjB4Qjk2ZjNGMjJBNEYwNjdmOTQ5QzE3NTdFQjk3N2ZmN0U1YTFlNGNEMCJ9",
    payload:
      "eyJkb21haW4iOiJuZXctbWluaS1hcHAtcXVpY2tzdGFydC1ldGEtb3BhbC52ZXJjZWwuYXBwIn0",
    signature:
      "AAAAAAAAAAAAAAAAyhG94Fl3s2MRZwKIYr4qFzl2yhEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiSCrVbLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAul7REO_bo9AFv8iC11NYrLu4WEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASQ_-6NvAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAASrAlgGv_3t8dzW2-_uC-CKqlGXoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAPhSELIcxQMC9He6VmhtIBncm2etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBqwplcTBuHBlgsZmdt2DKCJiP37aDkQWCEVMhHmfvmHcP8sEYuOSN7-OjAAtRJjzzAg3GE82NuvVkM31zTyhF4hsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZJJkkmSSZJJkkmSSZJJkkmSSZJJkkmSSZJJkkmSSZJI",
  },
  ...(BUILDER_OWNER_ADDRESS
    ? {
        baseBuilder: {
          ownerAddress: BUILDER_OWNER_ADDRESS,
        },
      }
    : {}),
  miniapp: {
    version: "1",
    name: "Pay Link",
    subtitle: "One-time USDC requests on Base",
    description:
      "Create and share a fixed-amount USDC payment link on Base mainnet.",
    tagline: "One link. One payment. Base mainnet.",
    ogTitle: "Pay Link",
    ogDescription:
      "Create a one-time USDC payment link on Base and close it automatically after the first verified payment.",
    canonicalDomain: ROOT_DOMAIN,
    requiredCapabilities: ["wallet.getEthereumProvider", "actions.ready"],
    requiredChains: ["eip155:8453"],
    screenshotUrls: [
      `${ROOT_URL}/distribution/screenshot-home.png`,
      `${ROOT_URL}/distribution/screenshot-create.png`,
    ],
    iconUrl: `${ROOT_URL}/distribution/icon-1024.png`,
    splashImageUrl: `${ROOT_URL}/distribution/splash-200.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    primaryCategory: "finance",
    tags: ["payments", "usdc", "base", "links"],
    heroImageUrl: `${ROOT_URL}/distribution/hero-home.png`,
    ogImageUrl: `${ROOT_URL}/distribution/og-share.png`,
  },
} as const;
