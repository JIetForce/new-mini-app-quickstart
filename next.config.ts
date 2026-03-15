import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const frameAncestorEnvName = "PAY_LINK_ALLOWED_FRAME_ANCESTORS";

const localFrameAncestors = [
  "http://localhost:*",
  "http://127.0.0.1:*",
  "https://localhost:*",
  "https://127.0.0.1:*",
];

const frameAncestorSourcePattern =
  /^https?:\/\/(?:\*\.)?(?:localhost|127(?:\.\d{1,3}){3}|[a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::(?:\d{1,5}|\*))?$/i;

function parseFrameAncestors(
  rawValue: string | undefined,
): { sources: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const sources: string[] = [];
  const invalid: string[] = [];
  const tokens = (rawValue ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (!frameAncestorSourcePattern.test(token)) {
      invalid.push(token);
      continue;
    }

    const normalized = token.toLowerCase();
    const isLocalHttpSource =
      normalized.startsWith("http://localhost") ||
      normalized.startsWith("http://127.");

    if (!isLocalHttpSource && !normalized.startsWith("https://")) {
      invalid.push(token);
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    sources.push(normalized);
  }

  return { sources, invalid };
}

function getFrameAncestorsSources(): string[] {
  const configured = parseFrameAncestors(process.env[frameAncestorEnvName]);

  if (configured.invalid.length > 0) {
    console.warn(
      `[security] Ignoring invalid ${frameAncestorEnvName} entries: ${configured.invalid.join(", ")}`,
    );
  }

  if (configured.sources.length > 0) {
    return ["'self'", ...configured.sources];
  }

  if (isDev) {
    return ["'self'", ...localFrameAncestors];
  }

  return ["'self'"];
}

const frameAncestors = getFrameAncestorsSources().join(" ");
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-ancestors ${frameAncestors}`,
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
