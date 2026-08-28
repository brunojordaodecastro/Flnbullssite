import { getPlayerFromSession, getSessionToken } from "@/lib/auth";
import { createMatch, getMatchTactics, getRecentMatches } from "@/lib/match-store";
import { bulls, type MatchTeam, type PitchPlayer, type RecentMatch } from "@/lib/matches";
import { getRosterPlayers } from "@/lib/team";

const SLOT_COORDS = [
  { x: 50, y: 86 },
  { x: 28, y: 68 },
  { x: 72, y: 68 },
  { x: 16, y: 44 },
  { x: 50, y: 42 },
  { x: 84, y: 44 },
  { x: 50, y: 18 },
];

/**
 * Spreads the admin's picks over the 2-3-1 pitch slots, respecting each
 * player's declared position before falling back to the remaining coordinates.
 */
async function buildLineup(selectedPlayerIds: string[]) {
  const roster = await getRosterPlayers();
  const selected = roster.filter((p) => selectedPlayerIds.includes(p.id));

  if (selected.length === 0) {
    return null;
  }

  const players: PitchPlayer[] = selected.map((p) => ({
    id: p.id,
    name: p.playerName,
    number: p.jerseyNumber,
    position: p.position,
    avatarUrl: p.avatarUrl,
    rating: 7.0,
    goals: 0,
    assists: 0,
    x: 0,
    y: 0,
  }));

  const goleiros = players.filter((p) => p.position === "Goleiro");
  const zagueiros = players.filter((p) => p.position.includes("Zagueiro") || p.position.includes("Fixo"));
  const alas = players.filter((p) => p.position.includes("Ala"));
  const meias = players.filter((p) => p.position.includes("Meia"));
  const atacantes = players.filter((p) => p.position.includes("Atacante") || p.position.includes("Pivô"));

  const starters: PitchPlayer[] = [];
  const usedIds = new Set<string>();

  if (goleiros.length > 0) {
    starters.push({ ...goleiros[0], x: 50, y: 86 });
    usedIds.add(goleiros[0].id);
  }

  for (const z of zagueiros) {
    if (starters.length < 3 && !usedIds.has(z.id)) {
      const posX = starters.filter((p) => zagueiros.some((zg) => zg.id === p.id)).length === 0 ? 28 : 72;
      starters.push({ ...z, x: posX, y: 68 });
      usedIds.add(z.id);
    }
  }

  for (const a of alas) {
    if (starters.length < 5 && !usedIds.has(a.id)) {
      const posX = starters.filter((p) => alas.some((al) => al.id === p.id)).length === 0 ? 16 : 84;
      starters.push({ ...a, x: posX, y: 44 });
      usedIds.add(a.id);
    }
  }

  for (const m of meias) {
    if (starters.length < 6 && !usedIds.has(m.id)) {
      starters.push({ ...m, x: 50, y: 42 });
      usedIds.add(m.id);
    }
  }

  for (const at of atacantes) {
    if (starters.length < 7 && !usedIds.has(at.id)) {
      starters.push({ ...at, x: 50, y: 18 });
      usedIds.add(at.id);
    }
  }

  const remaining = players.filter((p) => !usedIds.has(p.id));

  while (starters.length < 7 && remaining.length > 0) {
    const nextPlayer = remaining.shift()!;
    const coord = SLOT_COORDS[starters.length] || { x: 50, y: 50 };
    starters.push({ ...nextPlayer, x: coord.x, y: coord.y });
    usedIds.add(nextPlayer.id);
  }

  const bench = players.filter((p) => !usedIds.has(p.id)).map((p) => ({ ...p, x: 0, y: 0 }));

  return { starters, bench };
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
    date: string;
    time?: string;
    opponentName: string;
    opponentMark?: string;
    opponentCrest?: string;
    isHome?: boolean;
    isUpcoming?: boolean;
    bullsGoals?: number;
    opponentGoals?: number;
    instagramLink?: string;
    selectedPlayerIds?: string[];
  };

  if (!data.date || !data.opponentName) {
    return Response.json(
      { error: "Preencha a data e o nome do adversário." },
      { status: 400 },
    );
  }

  const isHome = data.isHome !== false;
  const isUpcoming = Boolean(data.isUpcoming);

  const opponentTeam: MatchTeam = {
    name: data.opponentName.trim(),
    mark: (data.opponentMark?.trim() || data.opponentName.slice(0, 2)).toUpperCase(),
    crest: data.opponentCrest?.trim() || undefined,
  };

  let score = "vs";
  let result: "Vitória" | "Empate" | "Derrota" | "Agendado" = "Agendado";
  const time = data.time?.trim() || undefined;

  if (!isUpcoming) {
    const bGoals = Number(data.bullsGoals || 0);
    const oGoals = Number(data.opponentGoals || 0);
    score = isHome ? `${bGoals}–${oGoals}` : `${oGoals}–${bGoals}`;
    result = bGoals > oGoals ? "Vitória" : bGoals === oGoals ? "Empate" : "Derrota";
  } else if (time) {
    score = time;
  }

  const newMatch: RecentMatch = {
    date: data.date.trim(),
    time,
    home: isHome ? bulls : opponentTeam,
    away: isHome ? opponentTeam : bulls,
    score,
    result,
    link: data.instagramLink?.trim() || undefined,
  };

  try {
    const lineup =
      Array.isArray(data.selectedPlayerIds) && data.selectedPlayerIds.length > 0
        ? await buildLineup(data.selectedPlayerIds)
        : null;

    const stored = await createMatch(newMatch, lineup ?? undefined);
    const [matches, tactics] = await Promise.all([
      getRecentMatches(),
      getMatchTactics(stored.id),
    ]);

    return Response.json({
      message: isUpcoming
        ? "Próximo jogo agendado com sucesso!"
        : "Partida finalizada cadastrada com sucesso!",
      match: stored,
      matches,
      tactics,
    });
  } catch (error) {
    console.error("api-admin-matches-create-failed", error);
    return Response.json(
      { error: "Erro ao salvar a partida no banco." },
      { status: 500 },
    );
  }
}
