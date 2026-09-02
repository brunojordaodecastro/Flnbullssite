import { getPlayerFromSession, getSessionToken } from "@/lib/auth";
import {
  addMatchEvent,
  getLatestMatch,
  getMatchTactics,
} from "@/lib/match-store";
import {
  DEFAULT_MATCH_TACTICS,
  organizeLineupByRatings,
  type MatchEvent,
  type PitchPlayer,
} from "@/lib/matches";
import { getPostMatchStatus } from "@/lib/evaluations";
import { getRosterPlayers } from "@/lib/team";

function normalizeName(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export async function GET() {
  const tactics = await getMatchTactics();

  try {
    const roster = await getRosterPlayers();

    function enrich(p: PitchPlayer): PitchPlayer {
      const normP = normalizeName(p.name);
      const byName = roster.find(
        (rp) => normalizeName(rp.playerName) === normP || rp.id === p.id,
      );
      if (byName?.avatarUrl) {
        return { ...p, avatarUrl: byName.avatarUrl };
      }
      if (byName) {
        return p;
      }

      const byNumberWithAvatar = roster.find(
        (rp) => rp.jerseyNumber === p.number && Boolean(rp.avatarUrl),
      );
      if (byNumberWithAvatar?.avatarUrl) {
        return { ...p, avatarUrl: byNumberWithAvatar.avatarUrl };
      }

      return p;
    }

    const allEnriched = [
      ...tactics.starters.map(enrich),
      ...tactics.bench.map(enrich),
    ];

    const { starters, bench } = organizeLineupByRatings(allEnriched);

    return Response.json(
      { tactics: { ...tactics, starters, bench } },
      { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } },
    );
  } catch (err) {
    console.error("latest-events-get-failed", err);
    return Response.json(
      { tactics },
      { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } },
    );
  }
}

export async function POST(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json(
      { error: "Faça login com seu perfil do Bulls para registrar estatísticas." },
      { status: 401 },
    );
  }

  const user = await getPlayerFromSession(token);
  if (!user) {
    return Response.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const status = await getPostMatchStatus(user.id);
  if (!status.isEscalado) {
    return Response.json(
      { error: "Voce nao foi escalado para este jogo." },
      { status: 403 },
    );
  }
  if (!status.isOpen) {
    return Response.json(
      { error: "As estatisticas liberam 1h apos o horario do jogo." },
      { status: 400 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const data = payload as {
    type?: "goal" | "assist";
    minute?: string;
    assistPlayerName?: string;
    detail?: string;
  };

  if (!data.type || !["goal", "assist"].includes(data.type)) {
    return Response.json({ error: "Tipo de participação inválido." }, { status: 400 });
  }

  try {
    const match = await getLatestMatch();
    if (!match) {
      return Response.json(
        { error: "Nenhuma partida cadastrada para receber eventos." },
        { status: 404 },
      );
    }

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      minute: data.minute ? `${data.minute.replace(/[^0-9]/g, "")}'` : "Jogo",
      type: data.type,
      team: "bulls",
      playerName: user.playerName,
      assistPlayerName: data.assistPlayerName?.trim() || undefined,
      scoreSnapshot: match.score,
      detail:
        data.detail?.trim() ||
        (data.type === "goal" ? "Gol marcado pelo atleta" : "Passe para gol"),
    };

    await addMatchEvent(match.id, newEvent);
    const tactics = await getMatchTactics(match.id);

    return Response.json({
      message: `${data.type === "goal" ? "Gol" : "Assistência"} registrado(a) com sucesso!`,
      event: newEvent,
      events: tactics.events.length > 0 ? tactics.events : DEFAULT_MATCH_TACTICS.events,
    });
  } catch (error) {
    console.error("latest-events-post-failed", error);
    return Response.json(
      { error: "Erro ao registrar o evento no banco." },
      { status: 500 },
    );
  }
}
