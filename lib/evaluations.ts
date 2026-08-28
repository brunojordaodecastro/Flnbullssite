import { getD1 } from "@/db";

import {
  getLatestMatch,
  getMatchTactics,
  saveLineup,
  type StoredMatch,
} from "./match-store";
import {
  organizeLineupByRatings,
  type PitchPlayer,
  type RecentMatch,
} from "./matches";
import { getRosterPlayers } from "./team";

export type PostMatchSubmission = {
  id: string;
  userId: string;
  playerName: string;
  matchId: string;
  goals: number;
  assists: number;
  ratingsGiven: Record<string, number>; // targetPlayerId -> rating (0 - 10)
  createdAt: string;
};

// Base initial ratings for seed players if no evaluations exist yet
const INITIAL_SEED_RATINGS: Record<string, number> = {
  neto: 8.2,
  matheus: 7.8,
  vini: 7.9,
  gui: 8.9,
  rafa: 9.2,
  lucas: 7.6,
  jordao: 9.8,
  biel: 7.2,
  leo: 7.0,
  pedro: 6.9,
  caio: 6.8,
};

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

export function parseMatchDateTime(dateStr: string, timeStr?: string): Date | null {
  try {
    const parts = dateStr.trim().split(" ");
    if (parts.length < 3) return null;

    const day = parseInt(parts[0], 10);
    const month = MONTH_MAP[parts[1].toLowerCase()] ?? 0;
    const year = parseInt(parts[2], 10);

    let hours = 19;
    let minutes = 30;

    if (timeStr && timeStr.includes(":")) {
      const [hStr, mStr] = timeStr.split(":");
      hours = parseInt(hStr, 10) || 0;
      minutes = parseInt(mStr, 10) || 0;
    }

    return new Date(year, month, day, hours, minutes, 0, 0);
  } catch {
    return null;
  }
}

export function isEvaluationWindowOpen(match: RecentMatch): boolean {
  if (match.result !== "Agendado") {
    // Already played / concluded match - evaluation is immediately open
    return true;
  }

  const matchDate = parseMatchDateTime(match.date, match.time);
  if (!matchDate) return true;

  const oneHourAfter = matchDate.getTime() + 60 * 60 * 1000;
  return Date.now() >= oneHourAfter;
}

type RatingRow = { target_key: string; rating: number };

/**
 * Every rating handed out by teammates for a match, as
 * targetKey -> list of ratings received.
 */
async function getReceivedRatings(
  matchId: string,
): Promise<Map<string, number[]>> {
  const received = new Map<string, number[]>();

  try {
    const rows = await getD1()
      .prepare(
        `SELECT r.target_key, r.rating
         FROM match_evaluation_ratings r
         JOIN match_evaluations e ON e.id = r.evaluation_id
         WHERE e.match_id = ?`,
      )
      .bind(matchId)
      .all<RatingRow>();

    for (const row of rows.results ?? []) {
      const key = row.target_key.toLowerCase().trim();
      const list = received.get(key) ?? [];
      list.push(row.rating);
      received.set(key, list);
    }
  } catch (error) {
    console.error("evaluations-received-ratings-failed", error);
  }

  return received;
}

async function hasUserSubmitted(matchId: string, userId: string) {
  try {
    const row = await getD1()
      .prepare(
        "SELECT id FROM match_evaluations WHERE match_id = ? AND user_id = ?",
      )
      .bind(matchId, userId)
      .first<{ id: string }>();

    return Boolean(row);
  } catch (error) {
    console.error("evaluations-has-submitted-failed", error);
    return false;
  }
}

export async function getPostMatchStatus(userId?: string) {
  const currentMatch = await getLatestMatch();
  if (!currentMatch) {
    return {
      isOpen: false,
      isEscalado: false,
      hasSubmitted: false,
      match: null,
      teammates: [],
    };
  }

  const isOpen = isEvaluationWindowOpen(currentMatch);
  const tactics = await getMatchTactics(currentMatch.id);

  // Get all players on the match lineup (starters + bench)
  const allLineupPlayers: PitchPlayer[] = [...tactics.starters, ...tactics.bench];

  const roster = await getRosterPlayers();

  // Find if user is escalado in this match
  const userPlayer = userId
    ? allLineupPlayers.find((p) => {
        if (p.id === userId) return true;
        const rosterP = roster.find((r) => r.id === userId);
        if (!rosterP) return false;
        return (
          p.name.toLowerCase().trim() === rosterP.playerName.toLowerCase().trim() ||
          p.number === rosterP.jerseyNumber
        );
      })
    : null;

  const isEscalado = Boolean(userPlayer);

  const hasSubmitted = userId
    ? await hasUserSubmitted(currentMatch.id, userId)
    : false;

  // Teammates to rate (all other escalados except this user)
  const teammates = isEscalado
    ? allLineupPlayers
        .filter((p) => p.id !== userPlayer?.id && p.name.toLowerCase().trim() !== userPlayer?.name.toLowerCase().trim())
        .map((p) => {
          const matched = roster.find(
            (rp) =>
              rp.id === p.id ||
              rp.playerName.toLowerCase().trim() === p.name.toLowerCase().trim() ||
              rp.jerseyNumber === p.number,
          );
          return {
            id: p.id,
            name: p.name,
            number: p.number,
            position: p.position,
            avatarUrl: matched?.avatarUrl || p.avatarUrl || null,
            currentRating: p.rating ?? 7.0,
          };
        })
    : [];

  return {
    isOpen,
    isEscalado,
    hasSubmitted,
    match: {
      id: currentMatch.id,
      date: currentMatch.date,
      time: currentMatch.time,
      home: currentMatch.home.name,
      away: currentMatch.away.name,
      score: currentMatch.score,
      result: currentMatch.result,
    },
    userPlayer: userPlayer
      ? {
          id: userPlayer.id,
          name: userPlayer.name,
          number: userPlayer.number,
          position: userPlayer.position,
          goals: userPlayer.goals || 0,
          assists: userPlayer.assists || 0,
        }
      : null,
    teammates,
  };
}

/**
 * Persists one player's post-match submission (own goals/assists plus the
 * ratings they gave to teammates), then recomputes every average and rewrites
 * the lineup so the pitch reflects the new ratings.
 */
export async function submitPostMatchEvaluation({
  userId,
  playerName,
  goals,
  assists,
  ratingsGiven,
}: {
  userId: string;
  playerName: string;
  goals: number;
  assists: number;
  ratingsGiven: Record<string, number>;
}) {
  const currentMatch: StoredMatch | null = await getLatestMatch();
  if (!currentMatch) {
    return {
      success: false,
      message: "Nenhuma partida disponível para avaliação.",
      tactics: await getMatchTactics(),
    };
  }

  const db = getD1();
  const evaluationId = `${currentMatch.id}:${userId}`;
  const now = new Date().toISOString();

  const cleanGoals = Math.max(0, Math.min(20, Number(goals) || 0));
  const cleanAssists = Math.max(0, Math.min(20, Number(assists) || 0));

  const cleanRatings: Record<string, number> = {};
  for (const [targetId, val] of Object.entries(ratingsGiven)) {
    const num = Number(val);
    if (!isNaN(num)) {
      cleanRatings[targetId] = Math.max(0, Math.min(10, Math.round(num * 10) / 10));
    }
  }

  // Re-submitting replaces the previous answers for this match.
  const statements = [
    db
      .prepare(
        `INSERT INTO match_evaluations
           (id, match_id, user_id, player_name, goals, assists, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(match_id, user_id) DO UPDATE SET
           player_name = excluded.player_name,
           goals = excluded.goals,
           assists = excluded.assists,
           updated_at = excluded.updated_at`,
      )
      .bind(
        evaluationId,
        currentMatch.id,
        userId,
        playerName,
        cleanGoals,
        cleanAssists,
        now,
        now,
      ),
    db
      .prepare("DELETE FROM match_evaluation_ratings WHERE evaluation_id = ?")
      .bind(evaluationId),
    ...Object.entries(cleanRatings).map(([targetKey, rating]) =>
      db
        .prepare(
          `INSERT INTO match_evaluation_ratings (id, evaluation_id, target_key, rating)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(`${evaluationId}:${targetKey}`, evaluationId, targetKey, rating),
    ),
  ];

  await db.batch(statements);

  const tactics = await getMatchTactics(currentMatch.id);
  const allLineupPlayers = [...tactics.starters, ...tactics.bench].map((p) => {
    if (
      p.id === userId ||
      p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
    ) {
      return { ...p, goals: cleanGoals, assists: cleanAssists };
    }
    return { ...p };
  });

  const received = await getReceivedRatings(currentMatch.id);
  recalculateAverageRatings(allLineupPlayers, received);

  // Position the highest-rated players as starters and remaining to bench
  const { starters, bench } = organizeLineupByRatings(allLineupPlayers);
  await saveLineup(currentMatch.id, starters, bench);

  return {
    success: true,
    message: "Avaliação e estatísticas pós-jogo registradas com sucesso!",
    tactics: { ...tactics, starters, bench },
  };
}

/**
 * Arithmetic average (média aritmética) of every rating a player received for
 * the match. Mutates the given players in place.
 */
export function recalculateAverageRatings(
  players: PitchPlayer[],
  receivedRatings: Map<string, number[]>,
) {
  for (const player of players) {
    const byId = receivedRatings.get(player.id.toLowerCase().trim()) ?? [];
    const byName = receivedRatings.get(player.name.toLowerCase().trim()) ?? [];
    const received = byId.length > 0 ? byId : byName;

    if (received.length > 0) {
      const sum = received.reduce((acc, curr) => acc + curr, 0);
      player.rating = Math.round((sum / received.length) * 10) / 10;
    } else if (player.rating === undefined) {
      // Fallback seed rating
      player.rating = INITIAL_SEED_RATINGS[player.id] ?? 7.0;
    }
  }
}
