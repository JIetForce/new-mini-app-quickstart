"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSiweMessage } from "viem/siwe";
import { stringToHex } from "viem";
import { useAccount, useConnect } from "wagmi";

import {
  PAY_LINK_CHAIN_HEX,
  PAY_LINK_CHAIN_ID,
  type WalletNonceResponse,
  type WalletSession,
  type WalletSessionResponse,
  normalizeWalletAddress,
} from "./shared";

type WalletConnectSignInResult = {
  address: string;
  message: string;
  signature: `0x${string}`;
};

type RequestableProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

function isMethodNotSupported(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /method[_ ]not[_ ]supported|unsupported|wallet_connect/i.test(
    error.message,
  );
}

function extractWalletConnectSignIn(
  value: unknown,
): WalletConnectSignInResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as {
    accounts?: Array<{
      address?: string;
      capabilities?: {
        signInWithEthereum?:
          | { message?: string; signature?: `0x${string}` }
          | { code?: number; message?: string };
      };
    }>;
  };

  const account = payload.accounts?.[0];
  const capability = account?.capabilities?.signInWithEthereum;

  if (!capability || typeof capability !== "object" || capability === null) {
    return null;
  }

  if (!("message" in capability) || !("signature" in capability)) {
    return null;
  }

  if (
    typeof account?.address !== "string" ||
    typeof capability.message !== "string" ||
    typeof capability.signature !== "string"
  ) {
    return null;
  }

  return {
    address: account.address,
    message: capability.message,
    signature: capability.signature,
  };
}

export function useWalletSession() {
  const { address, connector } = useAccount();
  const { connectAsync, connectors } = useConnect();
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
    const payload = (await response.json()) as WalletNonceResponse & {
      message?: string;
    };

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
    const payload = (await response.json()) as WalletSessionResponse & {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || "Unable to read wallet session.");
    }

    setSession(payload.session);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [sessionResponse, nonceResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/auth/nonce", { cache: "no-store" }),
        ]);
        const sessionPayload = (await sessionResponse.json()) as WalletSessionResponse & {
          message?: string;
        };
        const noncePayload = (await nonceResponse.json()) as WalletNonceResponse & {
          message?: string;
        };

        if (!sessionResponse.ok) {
          throw new Error(
            sessionPayload.message || "Unable to read wallet session.",
          );
        }

        if (!nonceResponse.ok || !noncePayload.nonce) {
          throw new Error(
            noncePayload.message || "Unable to start wallet sign-in.",
          );
        }

        if (!cancelled) {
          setSession(sessionPayload.session);
          nonceRef.current = noncePayload.nonce;
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
  }, []);

  async function getActiveConnector() {
    if (connector) {
      return connector;
    }

    const preferredConnector =
      connectors.find((item) => item.id === "farcaster") ??
      connectors.find((item) => item.id === "baseAccount") ??
      connectors[0];

    if (!preferredConnector) {
      throw new Error("No wallet connector is available.");
    }

    await connectAsync({ connector: preferredConnector });

    return preferredConnector;
  }

  async function authenticate() {
    setIsAuthenticating(true);
    setError("");

    try {
      const activeConnector = await getActiveConnector();
      const provider = (await activeConnector.getProvider()) as
        | RequestableProvider
        | undefined;

      if (!provider?.request) {
        throw new Error("Wallet provider is not available.");
      }

      const nonce = await fetchNonce(true);

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: PAY_LINK_CHAIN_HEX }],
        });
      } catch (switchError) {
        if (!isMethodNotSupported(switchError)) {
          throw switchError;
        }
      }

      let signIn = extractWalletConnectSignIn(
        await provider.request({
          method: "wallet_connect",
          params: [
            {
              version: "1",
              capabilities: {
                signInWithEthereum: {
                  chainId: PAY_LINK_CHAIN_HEX,
                  domain: window.location.host,
                  expirationTime: new Date(
                    Date.now() + 10 * 60 * 1000,
                  ).toISOString(),
                  issuedAt: new Date().toISOString(),
                  nonce,
                  scheme: window.location.protocol.replace(":", ""),
                  statement: "Sign in to Pay Link",
                  uri: window.location.origin,
                  version: "1",
                },
              },
            },
          ],
        }),
      );

      if (!signIn) {
        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];
        const walletAddress = accounts[0]
          ? normalizeWalletAddress(accounts[0], "Wallet address")
          : null;

        if (!walletAddress) {
          throw new Error("Wallet address is unavailable.");
        }

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
        const signature = (await provider.request({
          method: "personal_sign",
          params: [stringToHex(message), walletAddress],
        })) as `0x${string}`;

        signIn = {
          address: walletAddress,
          message,
          signature,
        };
      }

      const response = await fetch("/api/auth/verify", {
        body: JSON.stringify(signIn),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as WalletSessionResponse & {
        message?: string;
      };

      if (!response.ok || !payload.session) {
        throw new Error(payload.message || "Unable to verify wallet sign-in.");
      }

      nonceRef.current = null;
      setSession(payload.session);
      await fetchNonce(true);
    } catch (authError) {
      nonceRef.current = null;
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to sign in with wallet.",
      );
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
