import { getRosterPlayers } from "@/lib/team";

export async function GET() {
  try {
    const players = await getRosterPlayers();
    return Response.json(
      { players },
      { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("api-team-roster-error", error);
    return Response.json(
      { error: "Não foi possível carregar o elenco." },
      { status: 500 },
    );
  }
}

