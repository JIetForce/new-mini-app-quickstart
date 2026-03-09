"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { base } from "wagmi/chains";
import { createConfig, http, useAccount, useConnect, WagmiProvider } from "wagmi";
import { baseAccount } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { MiniAppProvider } from "./providers/MiniAppProvider";
import { useMiniApp } from "./providers/MiniAppProvider";
import { farcasterConfig } from "@/farcaster.config";

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [
    farcasterMiniApp(),
    baseAccount({
      appName: farcasterConfig.miniapp.name,
      appLogoUrl: farcasterConfig.miniapp.iconUrl,
    }),
  ],
});

function MiniAppWalletBootstrap() {
  const hasAttemptedConnection = useRef(false);
  const { isReady } = useMiniApp();
  const { address, isConnecting, isReconnecting } = useAccount();
  const { connectAsync, connectors } = useConnect();

  useEffect(() => {
    if (!isReady || address || isConnecting || isReconnecting || hasAttemptedConnection.current) {
      return;
    }

    const farcasterConnector = connectors.find(
      (connector) => connector.id === "farcaster",
    );

    if (!farcasterConnector) {
      return;
    }

    hasAttemptedConnection.current = true;

    void connectAsync({ connector: farcasterConnector }).catch(() => {
      hasAttemptedConnection.current = false;
    });
  }, [address, connectAsync, connectors, isConnecting, isReady, isReconnecting]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <MiniAppProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <MiniAppWalletBootstrap />
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </MiniAppProvider>
  );
}
