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

type AuthApiErrorPayload = {
  code?: string;
  message?: string;
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

  function logAuthEvent(
    event: string,
    details?: Record<string, unknown>,
  ) {
    console.info("[wallet-session]", event, details ?? {});
  }

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
        const [sessionResponse, nonceResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/auth/nonce", { cache: "no-store" }),
        ]);
        const sessionPayload =
          await readJsonResponse<WalletSessionResponse>(sessionResponse);
        const noncePayload =
          await readJsonResponse<WalletNonceResponse>(nonceResponse);

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

  async function getAuthenticationConnector() {
    const baseAccountConnector = connectors.find(
      (item) => item.id === "baseAccount",
    );

    if (baseAccountConnector) {
      logAuthEvent("using_auth_connector", {
        connectorId: baseAccountConnector.id,
        reason: "base-account-docs-path",
      });

      if (connector?.id !== baseAccountConnector.id) {
        await connectAsync({ connector: baseAccountConnector });
      }

      return baseAccountConnector;
    }

    const fallbackConnector =
      connector ??
      connectors.find((item) => item.id === "farcaster") ??
      connectors[0];

    if (!fallbackConnector) {
      throw new Error("No wallet connector is available.");
    }

    logAuthEvent("using_auth_connector", {
      connectorId: fallbackConnector.id,
      reason: "fallback-no-base-account-connector",
    });

    if (connector?.id !== fallbackConnector.id) {
      await connectAsync({ connector: fallbackConnector });
    }

    return fallbackConnector;
  }

  async function authenticate() {
    setIsAuthenticating(true);
    setError("");

    try {
      const activeConnector = await getAuthenticationConnector();
      const provider = (await activeConnector.getProvider()) as
        | RequestableProvider
        | undefined;

      if (!provider?.request) {
        throw new Error("Wallet provider is not available.");
      }

      const nonce = await fetchNonce(true);
      logAuthEvent("auth_provider_ready", {
        connectorId: activeConnector.id,
      });

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
        await (async () => {
          logAuthEvent("wallet_connect_attempt", {
            connectorId: activeConnector.id,
          });

          try {
            return await provider.request({
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
            });
          } catch (walletConnectError) {
            if (!isMethodNotSupported(walletConnectError)) {
              throw walletConnectError;
            }

            logAuthEvent("wallet_connect_unsupported", {
              connectorId: activeConnector.id,
              message:
                walletConnectError instanceof Error
                  ? walletConnectError.message
                  : "wallet_connect unsupported",
            });

            return null;
          }
        })(),
      );

      if (!signIn) {
        logAuthEvent("siwe_fallback_personal_sign", {
          connectorId: activeConnector.id,
        });
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
      const payload = await readJsonResponse<WalletSessionResponse>(response);

      if (!response.ok || !payload.session) {
        throw new Error(payload.message || "Unable to verify wallet sign-in.");
      }

      nonceRef.current = null;
      setSession(payload.session);
      await fetchNonce(true);
    } catch (authError) {
      nonceRef.current = null;
      const finalMessage =
        authError instanceof Error
          ? authError.message
          : "Unable to sign in with wallet.";
      logAuthEvent("auth_failed", {
        message: finalMessage,
      });
      setError(
        finalMessage,
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
