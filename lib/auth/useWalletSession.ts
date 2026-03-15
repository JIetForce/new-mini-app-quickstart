"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSiweMessage } from "viem/siwe";
import { useAccount, useConnect, useSignMessage } from "wagmi";

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

  async function resolveAuthenticationWallet() {
    if (address) {
      const normalizedAddress = normalizeWalletAddress(address, "Wallet address");

      return {
        walletAddress: normalizedAddress,
        activeConnector: connector ?? undefined,
      };
    }

    const fallbackConnector =
      connectors.find((item) => item.id === "baseAccount") ??
      connectors.find((item) => item.id === "farcaster") ??
      connectors[0];

    if (!fallbackConnector) {
      throw new Error("No wallet connector is available.");
    }

    const result = await connectAsync({ connector: fallbackConnector });
    const connectedAddress = result.accounts?.[0]
      ? normalizeWalletAddress(result.accounts[0], "Wallet address")
      : null;

    if (!connectedAddress) {
      throw new Error("Wallet address is unavailable.");
    }

    return {
      walletAddress: connectedAddress,
      activeConnector: fallbackConnector,
    };
  }

  async function authenticate() {
    setIsAuthenticating(true);
    setError("");

    try {
      const { activeConnector, walletAddress } =
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

      const signature = await signMessageAsync({
        account: walletAddress,
        connector: activeConnector,
        message,
      });

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
