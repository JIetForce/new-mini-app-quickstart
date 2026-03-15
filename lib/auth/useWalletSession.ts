"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Address, stringToHex } from "viem";
import { createSiweMessage } from "viem/siwe";
import { type Connector, useAccount, useConnect, useSignMessage } from "wagmi";

import {
  PAY_LINK_CHAIN_ID,
  type WalletNonceResponse,
  type WalletSession,
  type WalletSessionResponse,
  normalizeWalletAddress,
} from "./shared";

type AuthApiErrorPayload = {
  code?: string;
  message?: string;
};

type BrowserEthereumProvider = {
  request(args: {
    method: string;
    params?: readonly unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: BrowserEthereumProvider;
  }
}

type AuthenticationWallet = {
  walletAddress: Address;
  activeConnector?: Connector;
  browserProvider?: BrowserEthereumProvider | null;
};

async function readJsonResponse<T>(
  response: Response,
): Promise<T & AuthApiErrorPayload> {
  const text = await response.text();

  if (!text) {
    return {} as T & AuthApiErrorPayload;
  }

  try {
    return JSON.parse(text) as T & AuthApiErrorPayload;
  } catch {
    return {} as T & AuthApiErrorPayload;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function isWalletConnectUnsupportedError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("wallet_connect") &&
    message.includes("not supported")
  ) || message.includes("method_not_supported");
}

function isRecoverableConnectError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return (
    isWalletConnectUnsupportedError(error) ||
    message.includes("no injected provider") ||
    message.includes("provider not found") ||
    message.includes("connector not found")
  );
}

function getBrowserProvider(): BrowserEthereumProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const topWindow = window.top as (Window & typeof globalThis) | null;
    const topProvider =
      topWindow && "ethereum" in topWindow ? topWindow.ethereum : undefined;

    if (topProvider && typeof topProvider.request === "function") {
      return topProvider as BrowserEthereumProvider;
    }
  } catch {
    // Ignore cross-origin top window access and fall back to the local provider.
  }

  const provider = window.ethereum;

  if (provider && typeof provider.request === "function") {
    return provider as BrowserEthereumProvider;
  }

  return null;
}

function getOrderedConnectors(connectors: readonly Connector[]): Connector[] {
  const preferredIds = ["baseAccount", "injected", "farcaster"];
  const seen = new Set<string>();
  const ordered: Connector[] = [];

  for (const id of preferredIds) {
    const match = connectors.find((connector) => connector.id === id);

    if (match && !seen.has(match.uid)) {
      seen.add(match.uid);
      ordered.push(match);
    }
  }

  for (const connector of connectors) {
    if (seen.has(connector.uid)) {
      continue;
    }

    seen.add(connector.uid);
    ordered.push(connector);
  }

  return ordered;
}

async function requestProviderAccounts(
  provider: BrowserEthereumProvider,
): Promise<Address> {
  const accounts = await provider.request({
    method: "eth_requestAccounts",
  });
  const firstAccount = Array.isArray(accounts) ? accounts[0] : null;

  if (typeof firstAccount !== "string" || !firstAccount) {
    throw new Error("Wallet address is unavailable.");
  }

  return normalizeWalletAddress(firstAccount, "Wallet address") as Address;
}

async function ensureProviderAccount(
  provider: BrowserEthereumProvider,
  walletAddress: Address,
): Promise<void> {
  const accounts = await provider.request({
    method: "eth_accounts",
  });

  if (Array.isArray(accounts)) {
    const hasMatchingAccount = accounts.some((account) => {
      if (typeof account !== "string" || !account) {
        return false;
      }

      try {
        return (
          normalizeWalletAddress(account, "Wallet address").toLowerCase() ===
          walletAddress.toLowerCase()
        );
      } catch {
        return false;
      }
    });

    if (hasMatchingAccount) {
      return;
    }
  }

  const requestedAddress = await requestProviderAccounts(provider);

  if (requestedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error("Connected wallet does not match the account used for sign-in.");
  }
}

async function signWithBrowserProvider(
  provider: BrowserEthereumProvider,
  walletAddress: Address,
  message: string,
): Promise<string> {
  const signature = await provider.request({
    method: "personal_sign",
    params: [stringToHex(message), walletAddress],
  });

  if (typeof signature !== "string" || !signature) {
    throw new Error("Wallet signature is unavailable.");
  }

  return signature;
}

export function useWalletSession(
  options: {
    prefetchNonce?: boolean;
  } = {},
) {
  const { prefetchNonce = true } = options;
  const { address, connector } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const [session, setSession] = useState<WalletSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState("");
  const nonceRef = useRef<string | null>(null);

  const sessionMismatch = useMemo(() => {
    if (!address || !session) {
      return false;
    }

    return address.toLowerCase() !== session.address.toLowerCase();
  }, [address, session]);

  async function fetchNonce(force = false): Promise<string> {
    if (!force && nonceRef.current) {
      return nonceRef.current;
    }

    const response = await fetch("/api/auth/nonce", {
      cache: "no-store",
    });
    const payload = await readJsonResponse<WalletNonceResponse>(response);

    if (!response.ok || !payload.nonce) {
      throw new Error(payload.message || "Unable to start wallet sign-in.");
    }

    nonceRef.current = payload.nonce;
    return payload.nonce;
  }

  async function refreshSession() {
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
    });
    const payload = await readJsonResponse<WalletSessionResponse>(response);

    if (!response.ok) {
      throw new Error(payload.message || "Unable to read wallet session.");
    }

    setSession(payload.session);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const sessionPayload =
          await readJsonResponse<WalletSessionResponse>(sessionResponse);

        if (!sessionResponse.ok) {
          throw new Error(
            sessionPayload.message || "Unable to read wallet session.",
          );
        }

        let noncePayload: (WalletNonceResponse & AuthApiErrorPayload) | null =
          null;

        if (prefetchNonce) {
          const nonceResponse = await fetch("/api/auth/nonce", {
            cache: "no-store",
          });
          noncePayload = await readJsonResponse<WalletNonceResponse>(nonceResponse);

          if (!nonceResponse.ok || !noncePayload.nonce) {
            throw new Error(
              noncePayload.message || "Unable to start wallet sign-in.",
            );
          }
        }

        if (!cancelled) {
          setSession(sessionPayload.session);
          if (noncePayload?.nonce) {
            nonceRef.current = noncePayload.nonce;
          }
        }
      } catch (sessionError) {
        if (!cancelled) {
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : "Unable to load wallet session.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prefetchNonce]);

  async function resolveAuthenticationWallet(): Promise<AuthenticationWallet> {
    if (address) {
      const normalizedAddress = normalizeWalletAddress(
        address,
        "Wallet address",
      ) as Address;

      return {
        walletAddress: normalizedAddress,
        activeConnector: connector ?? undefined,
        browserProvider: getBrowserProvider(),
      };
    }

    let lastError: unknown = null;

    for (const candidate of getOrderedConnectors(connectors)) {
      try {
        const result = await connectAsync({ connector: candidate });
        const connectedAddress = result.accounts?.[0]
          ? (normalizeWalletAddress(
              result.accounts[0],
              "Wallet address",
            ) as Address)
          : null;

        if (!connectedAddress) {
          continue;
        }

        return {
          walletAddress: connectedAddress,
          activeConnector: candidate,
          browserProvider: getBrowserProvider(),
        };
      } catch (connectError) {
        lastError = connectError;

        if (isRecoverableConnectError(connectError)) {
          continue;
        }

        throw connectError;
      }
    }

    const browserProvider = getBrowserProvider();

    if (!browserProvider) {
      if (lastError instanceof Error) {
        throw lastError;
      }

      throw new Error("No wallet connector is available.");
    }

    const walletAddress = await requestProviderAccounts(browserProvider);

    return {
      walletAddress,
      browserProvider,
    };
  }

  async function authenticate() {
    setIsAuthenticating(true);
    setError("");

    try {
      const { activeConnector, browserProvider, walletAddress } =
        await resolveAuthenticationWallet();
      const nonce = await fetchNonce(true);
      const message = createSiweMessage({
        address: walletAddress,
        chainId: PAY_LINK_CHAIN_ID,
        domain: window.location.host,
        expirationTime: new Date(Date.now() + 10 * 60 * 1000),
        issuedAt: new Date(),
        nonce,
        scheme: window.location.protocol.replace(":", ""),
        statement: "Sign in to Pay Link",
        uri: window.location.origin,
        version: "1",
      });

      let signature: string;
      const fallbackProvider = browserProvider ?? getBrowserProvider();

      if (!activeConnector && fallbackProvider) {
        await ensureProviderAccount(fallbackProvider, walletAddress);
        signature = await signWithBrowserProvider(
          fallbackProvider,
          walletAddress,
          message,
        );
      } else {
        try {
          signature = await signMessageAsync({
            account: walletAddress,
            connector: activeConnector,
            message,
          });
        } catch (signError) {
          if (!isWalletConnectUnsupportedError(signError) || !fallbackProvider) {
            throw signError;
          }

          await ensureProviderAccount(fallbackProvider, walletAddress);
          signature = await signWithBrowserProvider(
            fallbackProvider,
            walletAddress,
            message,
          );
        }
      }

      const response = await fetch("/api/auth/verify", {
        body: JSON.stringify({
          address: walletAddress,
          message,
          signature,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = await readJsonResponse<WalletSessionResponse>(response);

      if (!response.ok || !payload.session) {
        throw new Error(payload.message || "Unable to verify wallet sign-in.");
      }

      nonceRef.current = null;
      setSession(payload.session);
    } catch (authError) {
      nonceRef.current = null;
      const finalMessage =
        authError instanceof Error
          ? authError.message
          : "Unable to sign in with wallet.";
      setError(finalMessage);
    } finally {
      setIsAuthenticating(false);
    }
  }

  return {
    address,
    authenticate,
    error,
    isAuthenticating,
    isLoading,
    refreshSession,
    session,
    sessionMismatch,
  };
}
