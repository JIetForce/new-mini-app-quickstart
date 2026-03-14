import { farcasterConfig } from "../../../farcaster.config";

export async function GET() {
  return Response.json(farcasterConfig, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
