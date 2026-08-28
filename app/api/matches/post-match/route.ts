import { getPlayerFromSession, getSessionToken } from "@/lib/auth";
import { getPostMatchStatus, submitPostMatchEvaluation } from "@/lib/evaluations";

export async function GET(request: Request) {
  try {
    const token = getSessionToken(request);
    const user = token ? await getPlayerFromSession(token) : null;

    const status = await getPostMatchStatus(user?.id);
    return Response.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("api-post-match-status-error", error);
    return Response.json(
      { error: "Erro ao consultar status pós-jogo." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = getSessionToken(request);
    if (!token) {
      return Response.json(
        { error: "Faça login com sua conta do Bulls para enviar sua avaliação." },
        { status: 401 },
      );
    }

    const user = await getPlayerFromSession(token);
    if (!user) {
      return Response.json({ error: "Sessão expirada." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const data = payload as {
      goals?: number;
      assists?: number;
      ratingsGiven?: Record<string, number>;
    };

    const status = await getPostMatchStatus(user.id);
    if (!status.isEscalado) {
      return Response.json(
        { error: "Você não foi escalado para este jogo." },
        { status: 403 },
      );
    }

    if (!status.isOpen) {
      return Response.json(
        { error: "A janela de avaliação pós-jogo ainda não abriu (disponível 1h após o jogo)." },
        { status: 400 },
      );
    }

    const result = await submitPostMatchEvaluation({
      userId: user.id,
      playerName: user.playerName,
      goals: Number(data.goals || 0),
      assists: Number(data.assists || 0),
      ratingsGiven: data.ratingsGiven || {},
    });

    return Response.json(result);
  } catch (error) {
    console.error("api-post-match-submit-error", error);
    return Response.json(
      { error: "Erro ao registrar avaliação pós-jogo." },
      { status: 500 },
    );
  }
}

