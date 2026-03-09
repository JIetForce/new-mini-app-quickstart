export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];

  return value || undefined;
}

export function getAppUrl(): string {
  return (
    getOptionalEnv("NEXT_PUBLIC_URL") ||
    (getOptionalEnv("VERCEL_PROJECT_PRODUCTION_URL")
      ? `https://${getOptionalEnv("VERCEL_PROJECT_PRODUCTION_URL")}`
      : undefined) ||
    (getOptionalEnv("VERCEL_URL")
      ? `https://${getOptionalEnv("VERCEL_URL")}`
      : undefined) ||
    "http://localhost:3000"
  );
}
