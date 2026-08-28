import { getPlayerFromSession, getSessionToken } from "@/lib/auth";
import {
  latestMatchTactics,
  organizeLineupByRatings,
  type PitchPlayer,
} from "@/lib/matches";

export async function GET() {
  return Response.json(
    {
      tactics: latestMatchTactics,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const currentUser = await getPlayerFromSession(token);
  if (!currentUser || currentUser.role !== "admin") {
    return Response.json(
      { error: "Acesso restrito para administradores." },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const data = payload as {
    ratings: Record<string, number>; // player id or name -> rating number
  };

  if (!data.ratings || typeof data.ratings !== "object") {
    return Response.json(
      { error: "Dicionário de notas inválido." },
      { status: 400 },
    );
  }

  // Combine all current pitch players
  const allPlayers: PitchPlayer[] = [
    ...latestMatchTactics.starters,
    ...latestMatchTactics.bench,
  ];

  // Apply ratings
  for (const player of allPlayers) {
    const key = player.id || player.name.toLowerCase();
    if (data.ratings[key] !== undefined) {
      player.rating = Math.round(Number(data.ratings[key]) * 10) / 10;
    }
  }

  // Reorganize starters and bench by highest rating per position
  const { starters, bench } = organizeLineupByRatings(allPlayers);

  // Update latestMatchTactics
  latestMatchTactics.starters = starters;
  latestMatchTactics.bench = bench;

  return Response.json({
    message: "Notas registradas e escalação reordenada com sucesso!",
    tactics: latestMatchTactics,
  });
}

