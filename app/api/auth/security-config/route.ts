import { getTurnstileSiteKey } from "@/lib/auth-security";

export function GET() {
  return Response.json(
    { turnstileSiteKey: getTurnstileSiteKey() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
