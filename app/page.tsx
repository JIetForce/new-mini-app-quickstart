import type { Metadata } from "next";

import { farcasterConfig } from "../farcaster.config";

import { HomePageClient } from "./HomePageClient";

const frameImageUrl = farcasterConfig.miniapp.heroImageUrl;
const launchUrl = farcasterConfig.miniapp.homeUrl;
const launchTitle = `Open ${farcasterConfig.miniapp.name}`;

export const metadata: Metadata = {
  alternates: {
    canonical: farcasterConfig.miniapp.homeUrl,
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: frameImageUrl,
      button: {
        title: launchTitle,
        action: {
          type: "launch_miniapp",
          url: launchUrl,
        },
      },
    }),
    "fc:frame": JSON.stringify({
      version: farcasterConfig.miniapp.version,
      imageUrl: frameImageUrl,
      button: {
        title: launchTitle,
        action: {
          type: "launch_frame",
          url: launchUrl,
        },
      },
    }),
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
