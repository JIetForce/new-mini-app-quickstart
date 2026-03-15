"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { base } from "wagmi/chains";
import {
  createConfig,
  http,
  useAccount,
  useConnect,
  WagmiProvider,
} from "wagmi";
import { baseAccount, injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { MiniAppProvider } from "./providers/MiniAppProvider";
import { useMiniApp } from "./providers/MiniAppProvider";
import { farcasterConfig } from "@/farcaster.config";

type BrowserEthereumProvider = {
  request(args: {
    method: string;
    params?: readonly unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
};

function isBrowserEthereumProvider(
  value: unknown,
): value is BrowserEthereumProvider {
  return Boolean(
    value &&
      typeof value === "object" &&
      "request" in value &&
      typeof value.request === "function",
  );
}

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [
    injected(),
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
    if (
      !isReady ||
      address ||
      isConnecting ||
      isReconnecting ||
      hasAttemptedConnection.current
    ) {
      return;
    }

    hasAttemptedConnection.current = true;

    const injectedConnector = connectors.find(
      (connector) => connector.id === "injected",
    );

    if (!injectedConnector) {
      return;
    }

    void (async () => {
      try {
        const provider = await injectedConnector.getProvider();

        if (!isBrowserEthereumProvider(provider)) {
          return;
        }

        const accounts = await provider.request({
          method: "eth_accounts",
        });

        if (Array.isArray(accounts) && accounts.some(Boolean)) {
          await connectAsync({ connector: injectedConnector });
        }
      } catch {
        // Best-effort only: embedded auth must still work from explicit user action.
      }
    })();
  }, [
    address,
    connectAsync,
    connectors,
    isConnecting,
    isReady,
    isReconnecting,
  ]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <MiniAppProvider>
      <WagmiProvider config={config} reconnectOnMount={false}>
        <QueryClientProvider client={queryClient}>
          <MiniAppWalletBootstrap />
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </MiniAppProvider>
  );
}
