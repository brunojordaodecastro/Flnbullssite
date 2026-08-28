import { getRecentMatches } from "@/lib/match-store";

export async function GET() {
  const matches = await getRecentMatches();

  return Response.json(
    { matches },
    { headers: { "Cache-Control": "no-store" } },
  );
}
