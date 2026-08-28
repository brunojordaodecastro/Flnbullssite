import {
  latestMatchTactics,
  organizeLineupByRatings,
  recentMatches,
  type PitchPlayer,
  type RecentMatch,
} from "./matches";
import { getRosterPlayers } from "./team";

export type PostMatchSubmission = {
  id: string;
  userId: string;
  playerName: string;
  matchKey: string;
  goals: number;
  assists: number;
  ratingsGiven: Record<string, number>; // targetPlayerId -> rating (0 - 10)
  createdAt: string;
};

// In-memory store for post-match evaluation submissions
const submissions: PostMatchSubmission[] = [];

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

export async function getPostMatchStatus(userId?: string) {
  const currentMatch = recentMatches[0];
  if (!currentMatch) {
    return {
      isOpen: false,
      isEscalado: false,
      hasSubmitted: false,
      match: null,
      teammates: [],
    };
  }

  const matchKey = `${currentMatch.date}_${currentMatch.away.name}`;
  const isOpen = isEvaluationWindowOpen(currentMatch);

  // Get all players on the match lineup (starters + bench)
  const allLineupPlayers: PitchPlayer[] = [
    ...latestMatchTactics.starters,
    ...latestMatchTactics.bench,
  ];

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
    ? submissions.some((s) => s.userId === userId && s.matchKey === matchKey)
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
  const currentMatch = recentMatches[0];
  const matchKey = currentMatch ? `${currentMatch.date}_${currentMatch.away.name}` : "latest";

  // Remove previous submission if re-submitting
  const existingIdx = submissions.findIndex((s) => s.userId === userId && s.matchKey === matchKey);
  const newSubmission: PostMatchSubmission = {
    id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    playerName,
    matchKey,
    goals: Math.max(0, Math.min(20, Number(goals) || 0)),
    assists: Math.max(0, Math.min(20, Number(assists) || 0)),
    ratingsGiven: {},
    createdAt: new Date().toISOString(),
  };

  // Clean ratings (0 to 10)
  for (const [targetId, val] of Object.entries(ratingsGiven)) {
    const num = Number(val);
    if (!isNaN(num)) {
      newSubmission.ratingsGiven[targetId] = Math.max(0, Math.min(10, Math.round(num * 10) / 10));
    }
  }

  if (existingIdx >= 0) {
    submissions[existingIdx] = newSubmission;
  } else {
    submissions.push(newSubmission);
  }

  // Update user's personal goals & assists in latestMatchTactics
  const allLineupPlayers = [
    ...latestMatchTactics.starters,
    ...latestMatchTactics.bench,
  ];

  for (const p of allLineupPlayers) {
    if (p.id === userId || p.name.toLowerCase().trim() === playerName.toLowerCase().trim()) {
      p.goals = newSubmission.goals;
      p.assists = newSubmission.assists;
    }
  }

  // Recalculate the arithmetic average (média aritmética) for each player
  recalculateAverageRatings(allLineupPlayers, matchKey);

  // Position the highest-rated players as starters and remaining to bench
  const { starters, bench } = organizeLineupByRatings(allLineupPlayers);
  latestMatchTactics.starters = starters;
  latestMatchTactics.bench = bench;

  return {
    success: true,
    message: "Avaliação e estatísticas pós-jogo registradas com sucesso!",
    tactics: latestMatchTactics,
  };
}

function recalculateAverageRatings(players: PitchPlayer[], matchKey: string) {
  const matchSubmissions = submissions.filter((s) => s.matchKey === matchKey);

  for (const player of players) {
    const receivedRatings: number[] = [];

    // Collect all ratings received from teammates for this player
    for (const sub of matchSubmissions) {
      // Find rating given by this teammate to 'player'
      for (const [targetKey, ratingVal] of Object.entries(sub.ratingsGiven)) {
        if (
          targetKey === player.id ||
          targetKey.toLowerCase().trim() === player.name.toLowerCase().trim()
        ) {
          receivedRatings.push(ratingVal);
        }
      }
    }

    if (receivedRatings.length > 0) {
      // Arithmetic average
      const sum = receivedRatings.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / receivedRatings.length;
      player.rating = Math.round(avg * 10) / 10;
    } else if (player.rating === undefined) {
      // Fallback seed rating
      player.rating = INITIAL_SEED_RATINGS[player.id] ?? 7.0;
    }
  }
}

