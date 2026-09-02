import { getD1 } from "@/db";
import { normalizePlayerPosition } from "@/lib/player";

import {
  DEFAULT_MATCH_TACTICS,
  DEFAULT_RECENT_MATCHES,
  organizeLineupByRatings,
  type MatchEvent,
  type MatchTactics,
  type MatchTeam,
  type PitchPlayer,
  type RecentMatch,
} from "./matches";

export type StoredMatch = RecentMatch & {
  id: string;
  formation: string;
};

type MatchRow = {
  id: string;
  match_date: string;
  match_time: string | null;
  home_name: string;
  home_mark: string;
  home_crest: string | null;
  away_name: string;
  away_mark: string;
  away_crest: string | null;
  score: string;
  result: string;
  link: string | null;
  formation: string | null;
  sort_order: number;
};

type LineupRow = {
  player_id: string;
  player_name: string;
  jersey_number: number;
  position: string;
  lineup_role: string;
  x: number;
  y: number;
  goals: number;
  assists: number;
  rating: number | null;
  slot_order: number;
};

type EventRow = {
  id: string;
  minute: string;
  type: string;
  team: string;
  player_name: string;
  assist_player_name: string | null;
  score_snapshot: string;
  detail: string | null;
};

const MATCH_COLUMNS = `id, match_date, match_time, home_name, home_mark, home_crest,
         away_name, away_mark, away_crest, score, result, link, formation, sort_order`;

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toTeam(name: string, mark: string, crest: string | null): MatchTeam {
  return { name, mark, crest: crest ?? undefined };
}

function toStoredMatch(row: MatchRow): StoredMatch {
  return {
    id: row.id,
    date: row.match_date,
    time: row.match_time ?? undefined,
    home: toTeam(row.home_name, row.home_mark, row.home_crest),
    away: toTeam(row.away_name, row.away_mark, row.away_crest),
    score: row.score,
    result: row.result as RecentMatch["result"],
    link: row.link ?? undefined,
    formation: row.formation ?? DEFAULT_MATCH_TACTICS.formation,
  };
}

function toPitchPlayer(row: LineupRow): PitchPlayer {
  return {
    id: row.player_id,
    name: row.player_name,
    number: row.jersey_number,
    position: normalizePlayerPosition(row.position),
    x: row.x,
    y: row.y,
    goals: row.goals,
    assists: row.assists,
    rating: row.rating ?? undefined,
  };
}

function toMatchEvent(row: EventRow): MatchEvent {
  return {
    id: row.id,
    minute: row.minute,
    type: row.type as MatchEvent["type"],
    team: row.team as MatchEvent["team"],
    playerName: row.player_name,
    assistPlayerName: row.assist_player_name ?? undefined,
    scoreSnapshot: row.score_snapshot,
    detail: row.detail ?? undefined,
  };
}

function lineupStatements(
  db: D1Database,
  matchId: string,
  starters: PitchPlayer[],
  bench: PitchPlayer[],
) {
  const insert = db.prepare(
    `INSERT INTO match_lineups
       (id, match_id, player_id, player_name, jersey_number, position,
        lineup_role, x, y, goals, assists, rating, slot_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(match_id, player_id) DO UPDATE SET
       player_name = excluded.player_name,
       jersey_number = excluded.jersey_number,
       position = excluded.position,
       lineup_role = excluded.lineup_role,
       x = excluded.x,
       y = excluded.y,
       goals = excluded.goals,
       assists = excluded.assists,
       rating = excluded.rating,
       slot_order = excluded.slot_order`,
  );

  const rows = [
    ...starters.map((player, index) => ({ player, role: "starter", index })),
    ...bench.map((player, index) => ({ player, role: "bench", index })),
  ];

  return rows.map(({ player, role, index }) =>
    insert.bind(
      `${matchId}:${player.id}`,
      matchId,
      player.id,
      player.name,
      player.number,
      player.position,
      role,
      Math.round(player.x ?? 0),
      Math.round(player.y ?? 0),
      player.goals ?? 0,
      player.assists ?? 0,
      player.rating ?? null,
      index,
    ),
  );
}

let seededInThisIsolate = false;

/**
 * Copies the seed matches into D1 the first time the table is empty. Uses
 * deterministic ids plus INSERT OR IGNORE so concurrent requests converge on
 * the same rows instead of duplicating the history.
 *
 * O flag de isolate só evita repetir o COUNT; se o isolate reciclar, a
 * checagem roda de novo e continua sendo idempotente.
 */
async function ensureSeeded(db: D1Database) {
  if (seededInThisIsolate) {
    return;
  }

  const existing = await db
    .prepare("SELECT COUNT(*) AS total FROM matches")
    .first<{ total: number }>();

  if ((existing?.total ?? 0) > 0) {
    seededInThisIsolate = true;
    return;
  }

  const total = DEFAULT_RECENT_MATCHES.length;
  const insertMatch = db.prepare(
    `INSERT OR IGNORE INTO matches
       (id, match_date, match_time, home_name, home_mark, home_crest,
        away_name, away_mark, away_crest, score, result, link, formation, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const statements = DEFAULT_RECENT_MATCHES.map((match, index) =>
    insertMatch.bind(
      `seed-${index}`,
      match.date,
      match.time ?? null,
      match.home.name,
      match.home.mark,
      match.home.crest ?? null,
      match.away.name,
      match.away.mark,
      match.away.crest ?? null,
      match.score,
      match.result,
      match.link ?? null,
      index === 0 ? DEFAULT_MATCH_TACTICS.formation : null,
      total - index,
    ),
  );

  statements.push(
    ...lineupStatements(
      db,
      "seed-0",
      DEFAULT_MATCH_TACTICS.starters,
      DEFAULT_MATCH_TACTICS.bench,
    ),
  );

  const insertEvent = db.prepare(
    `INSERT OR IGNORE INTO match_events
       (id, match_id, minute, type, team, player_name, assist_player_name,
        score_snapshot, detail, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  statements.push(
    ...DEFAULT_MATCH_TACTICS.events.map((event, index) =>
      insertEvent.bind(
        `seed-0:${event.id}`,
        "seed-0",
        event.minute,
        event.type,
        event.team,
        event.playerName,
        event.assistPlayerName ?? null,
        event.scoreSnapshot,
        event.detail ?? null,
        index,
      ),
    ),
  );

  await db.batch(statements);
  seededInThisIsolate = true;
}

const DEFAULT_STORED_MATCHES: StoredMatch[] = DEFAULT_RECENT_MATCHES.map(
  (match, index) => ({
    ...match,
    id: `seed-${index}`,
    formation: DEFAULT_MATCH_TACTICS.formation,
  }),
);

/**
 * Runs a read against D1, degrading to the seed data when the binding is
 * missing or the query fails — same contract as getRosterPlayers().
 */
async function readFromDb<T>(
  run: (db: D1Database) => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    const db = getD1();
    await ensureSeeded(db);
    return await run(db);
  } catch (error) {
    console.error(label, error);
    return fallback;
  }
}

export async function getRecentMatches(): Promise<StoredMatch[]> {
  return readFromDb(
    async (db) => {
      const rows = await db
        .prepare(
          `SELECT ${MATCH_COLUMNS} FROM matches
           ORDER BY sort_order DESC, created_at DESC, id DESC`,
        )
        .all<MatchRow>();

      const matches = (rows.results ?? []).map(toStoredMatch);
      return matches.length > 0 ? matches : DEFAULT_STORED_MATCHES;
    },
    DEFAULT_STORED_MATCHES,
    "match-store-recent-failed",
  );
}

export async function getLatestMatch(): Promise<StoredMatch | null> {
  const matches = await getRecentMatches();
  return matches[0] ?? null;
}

async function readTactics(
  db: D1Database,
  matchId: string,
  formation: string,
): Promise<MatchTactics> {
  const [lineupRows, eventRows] = await Promise.all([
    db
      .prepare(
        `SELECT player_id, player_name, jersey_number, position, lineup_role,
                x, y, goals, assists, rating, slot_order
         FROM match_lineups WHERE match_id = ?
         ORDER BY slot_order ASC`,
      )
      .bind(matchId)
      .all<LineupRow>(),
    db
      .prepare(
        `SELECT id, minute, type, team, player_name, assist_player_name,
                score_snapshot, detail
         FROM match_events WHERE match_id = ?
         ORDER BY sort_order ASC, created_at ASC`,
      )
      .bind(matchId)
      .all<EventRow>(),
  ]);

  const lineup = lineupRows.results ?? [];

  return {
    formation,
    starters: lineup
      .filter((row) => row.lineup_role === "starter")
      .map(toPitchPlayer),
    bench: lineup
      .filter((row) => row.lineup_role === "bench")
      .map(toPitchPlayer),
    events: (eventRows.results ?? []).map(toMatchEvent),
  };
}

export async function getMatchTactics(matchId?: string): Promise<MatchTactics> {
  return readFromDb(
    async (db) => {
      const target = matchId
        ? await db
            .prepare(`SELECT ${MATCH_COLUMNS} FROM matches WHERE id = ?`)
            .bind(matchId)
            .first<MatchRow>()
        : await db
            .prepare(
              `SELECT ${MATCH_COLUMNS} FROM matches
               ORDER BY sort_order DESC, created_at DESC, id DESC LIMIT 1`,
            )
            .first<MatchRow>();

      if (!target) {
        return DEFAULT_MATCH_TACTICS;
      }

      return readTactics(
        db,
        target.id,
        target.formation ?? DEFAULT_MATCH_TACTICS.formation,
      );
    },
    DEFAULT_MATCH_TACTICS,
    "match-store-tactics-failed",
  );
}

export async function createMatch(
  match: RecentMatch,
  lineup?: { starters: PitchPlayer[]; bench: PitchPlayer[] },
): Promise<StoredMatch> {
  const db = getD1();
  await ensureSeeded(db);

  const highest = await db
    .prepare("SELECT MAX(sort_order) AS top FROM matches")
    .first<{ top: number | null }>();

  const id = newId("match");
  const formation = DEFAULT_MATCH_TACTICS.formation;

  const statements = [
    db
      .prepare(
        `INSERT INTO matches
           (id, match_date, match_time, home_name, home_mark, home_crest,
            away_name, away_mark, away_crest, score, result, link, formation, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        match.date,
        match.time ?? null,
        match.home.name,
        match.home.mark,
        match.home.crest ?? null,
        match.away.name,
        match.away.mark,
        match.away.crest ?? null,
        match.score,
        match.result,
        match.link ?? null,
        formation,
        (highest?.top ?? 0) + 1,
      ),
  ];

  if (lineup) {
    statements.push(...lineupStatements(db, id, lineup.starters, lineup.bench));
  }

  await db.batch(statements);

  return { ...match, id, formation };
}

export async function saveLineup(
  matchId: string,
  starters: PitchPlayer[],
  bench: PitchPlayer[],
): Promise<void> {
  const db = getD1();
  await db.batch([
    db.prepare("DELETE FROM match_lineups WHERE match_id = ?").bind(matchId),
    ...lineupStatements(db, matchId, starters, bench),
  ]);
}

export async function addMatchEvent(
  matchId: string,
  event: MatchEvent,
): Promise<void> {
  const db = getD1();
  await ensureSeeded(db);

  const highest = await db
    .prepare(
      "SELECT MAX(sort_order) AS top FROM match_events WHERE match_id = ?",
    )
    .bind(matchId)
    .first<{ top: number | null }>();

  await db
    .prepare(
      `INSERT INTO match_events
         (id, match_id, minute, type, team, player_name, assist_player_name,
          score_snapshot, detail, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      matchId,
      event.minute,
      event.type,
      event.team,
      event.playerName,
      event.assistPlayerName ?? null,
      event.scoreSnapshot,
      event.detail ?? null,
      (highest?.top ?? -1) + 1,
    )
    .run();
}

/**
 * Applies a rating map to the stored lineup, reorders the pitch by rating and
 * writes the result back. Returns the tactics as persisted.
 */
export async function applyRatings(
  matchId: string,
  ratings: Record<string, number>,
): Promise<MatchTactics> {
  const db = getD1();
  await ensureSeeded(db);

  const match = await db
    .prepare(`SELECT ${MATCH_COLUMNS} FROM matches WHERE id = ?`)
    .bind(matchId)
    .first<MatchRow>();

  if (!match) {
    return DEFAULT_MATCH_TACTICS;
  }

  const current = await readTactics(
    db,
    matchId,
    match.formation ?? DEFAULT_MATCH_TACTICS.formation,
  );

  const allPlayers = [...current.starters, ...current.bench].map((player) => {
    const key = player.id || player.name.toLowerCase();
    const value = ratings[key];
    if (value === undefined) {
      return player;
    }
    return { ...player, rating: Math.round(Number(value) * 10) / 10 };
  });

  const { starters, bench } = organizeLineupByRatings(allPlayers);
  await saveLineup(matchId, starters, bench);

  return { ...current, starters, bench };
}
