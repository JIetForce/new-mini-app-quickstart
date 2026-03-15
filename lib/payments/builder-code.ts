import { Attribution } from "ox/erc8021";

const DEFAULT_BASE_BUILDER_CODE = "bc_clb4rq85";
const BUILDER_CODE_PATTERN = /^bc_[a-z0-9]+$/i;

function resolveBuilderCode(): string {
  const configuredCode = process.env.NEXT_PUBLIC_BASE_BUILDER_CODE?.trim();
  const builderCode = configuredCode || DEFAULT_BASE_BUILDER_CODE;

  if (!BUILDER_CODE_PATTERN.test(builderCode)) {
    throw new Error("Invalid NEXT_PUBLIC_BASE_BUILDER_CODE.");
  }

  return builderCode;
}

export const PAY_LINK_BUILDER_CODE = resolveBuilderCode();

export const PAY_LINK_BUILDER_CODE_SUFFIX = Attribution.toDataSuffix({
  codes: [PAY_LINK_BUILDER_CODE],
});
