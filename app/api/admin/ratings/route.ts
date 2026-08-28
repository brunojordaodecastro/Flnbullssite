import { getPlayerFromSession, getSessionToken } from "@/lib/auth";
import { applyRatings, getLatestMatch, getMatchTactics } from "@/lib/match-store";

export async function GET() {
  const tactics = await getMatchTactics();

  return Response.json(
    { tactics },
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

  try {
    const match = await getLatestMatch();
    if (!match) {
      return Response.json(
        { error: "Nenhuma partida cadastrada para receber notas." },
        { status: 404 },
      );
    }

    // Persists the ratings and reorders starters/bench by the new averages.
    const tactics = await applyRatings(match.id, data.ratings);

    return Response.json({
      message: "Notas registradas e escalação reordenada com sucesso!",
      tactics,
    });
  } catch (error) {
    console.error("api-admin-ratings-save-failed", error);
    return Response.json(
      { error: "Erro ao salvar as notas no banco." },
      { status: 500 },
    );
  }
}
