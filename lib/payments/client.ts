import {
  CHAIN_IDS,
  TOKENS,
  createBaseAccountSDK,
  type PayerInfo,
  type PayerInfoResponses,
  type PaymentOptions,
  type PaymentResult,
} from "@base-org/account";
import {
  encodeFunctionData,
  getAddress,
  isAddress,
  parseUnits,
  toHex,
  type Address,
} from "viem";

import { PAY_LINK_BUILDER_CODE_SUFFIX } from "./builder-code";

const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

type SendCallsCapabilityMap = {
  dataCallback?: {
    callbackURL?: string;
    requests: Array<{
      optional: boolean;
      type: string;
    }>;
  };
  dataSuffix: {
    optional: true;
    value: `0x${string}`;
  };
};

type SendCallsRequest = {
  calls: Array<{
    data: `0x${string}`;
    to: Address;
    value: `0x${string}`;
  }>;
  capabilities: SendCallsCapabilityMap;
  chainId: `0x${string}`;
  version: "2.0.0";
};

type SendCallsResponse =
  | string
  | {
      capabilities?: {
        dataCallback?: PayerInfoResponses;
      };
      id?: string;
    };

function validateAmount(amount: string): void {
  if (typeof amount !== "string") {
    throw new Error("Invalid amount: must be a string.");
  }

  const trimmedAmount = amount.trim();

  if (!trimmedAmount) {
    throw new Error("Invalid amount: value is required.");
  }

  if (!/^\d+(\.\d{1,6})?$/.test(trimmedAmount)) {
    throw new Error("Invalid amount: use up to 6 decimal places.");
  }

  if (Number(trimmedAmount) <= 0) {
    throw new Error("Invalid amount: must be greater than 0.");
  }
}

function normalizeRecipientAddress(address: string): Address {
  if (!isAddress(address)) {
    throw new Error("Invalid recipient address.");
  }

  return getAddress(address);
}

function buildSendCallsCapabilities(
  payerInfo?: PayerInfo,
): SendCallsCapabilityMap {
  const capabilities: SendCallsCapabilityMap = {
    dataSuffix: {
      optional: true,
      value: PAY_LINK_BUILDER_CODE_SUFFIX,
    },
  };

  if (payerInfo && payerInfo.requests.length > 0) {
    capabilities.dataCallback = {
      requests: payerInfo.requests.map((request) => ({
        optional: request.optional ?? false,
        type: request.type,
      })),
      ...(payerInfo.callbackURL ? { callbackURL: payerInfo.callbackURL } : {}),
    };
  }

  return capabilities;
}

function buildPaymentRequest(
  recipient: Address,
  amount: string,
  testnet: boolean,
  payerInfo?: PayerInfo,
): SendCallsRequest {
  const network = testnet ? "baseSepolia" : "base";
  const chainId = CHAIN_IDS[network];
  const transferData = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    args: [recipient, parseUnits(amount, TOKENS.USDC.decimals)],
    functionName: "transfer",
  });

  return {
    calls: [
      {
        data: transferData,
        to: TOKENS.USDC.addresses[network],
        value: toHex(0),
      },
    ],
    capabilities: buildSendCallsCapabilities(payerInfo),
    chainId: toHex(chainId),
    version: "2.0.0",
  };
}

function extractPaymentResult(result: SendCallsResponse): {
  payerInfoResponses?: PayerInfoResponses;
  transactionHash: string;
} {
  if (typeof result === "string" && result.length >= 66) {
    return {
      transactionHash: result.slice(0, 66),
    };
  }

  if (
    result &&
    typeof result === "object" &&
    typeof result.id === "string" &&
    result.id.length >= 66
  ) {
    return {
      payerInfoResponses: result.capabilities?.dataCallback,
      transactionHash: result.id.slice(0, 66),
    };
  }

  throw new Error("Unexpected response from wallet_sendCalls.");
}

export async function payWithBuilderCode(
  options: PaymentOptions,
): Promise<PaymentResult> {
  const {
    amount,
    payerInfo,
    telemetry = true,
    testnet = false,
    to,
    walletUrl,
  } = options;

  validateAmount(amount);

  const recipient = normalizeRecipientAddress(to);
  const network = testnet ? "baseSepolia" : "base";
  const chainId = CHAIN_IDS[network];
  const requestParams = buildPaymentRequest(recipient, amount, testnet, payerInfo);
  const sdk = createBaseAccountSDK({
    appChainIds: [chainId],
    appName:
      typeof window !== "undefined" ? window.location.origin : "Pay Link",
    preference: {
      telemetry,
      walletUrl,
    },
  });
  const provider = sdk.getProvider();

  try {
    const result = (await provider.request({
      method: "wallet_sendCalls",
      params: [requestParams],
    })) as SendCallsResponse;
    const { payerInfoResponses, transactionHash } = extractPaymentResult(result);

    return {
      amount,
      id: transactionHash,
      payerInfoResponses,
      success: true,
      to: recipient,
    };
  } finally {
    await provider.disconnect();
  }
}
