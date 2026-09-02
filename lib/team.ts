import { getD1 } from "@/db";
import { normalizePlayerPosition } from "@/lib/player";

export type RosterPlayer = {
  id: string;
  fullName: string;
  playerName: string;
  jerseyNumber: number;
  position: string;
  secondaryPosition: string | null;
  dominantFoot: string | null;
  role: string;
  rosterStatus: string;
  avatarUrl: string | null;
};

type StoredRosterRow = {
  id: string;
  full_name: string;
  player_name: string;
  jersey_number: number;
  position: string;
  secondary_position: string | null;
  dominant_foot: string | null;
  role: string;
  roster_status: string;
  avatar_key: string | null;
};

export const DEFAULT_ROSTER_PLAYERS: RosterPlayer[] = [
  { id: "neto", fullName: "Neto Silveira", playerName: "Neto", jerseyNumber: 1, position: "Goleiro", secondaryPosition: null, dominantFoot: "Destro", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "vini", fullName: "Vinícius Souza", playerName: "Vini", jerseyNumber: 3, position: "Zagueiro/Fixo", secondaryPosition: null, dominantFoot: "Destro", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "matheus", fullName: "Matheus Ramos", playerName: "Matheus", jerseyNumber: 4, position: "Zagueiro/Fixo", secondaryPosition: null, dominantFoot: "Destro", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "leo", fullName: "Leonardo Duarte", playerName: "Leo", jerseyNumber: 5, position: "Zagueiro/Fixo", secondaryPosition: null, dominantFoot: "Destro", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "lucas", fullName: "Lucas Ferreira", playerName: "Lucas", jerseyNumber: 7, position: "Ala Direito", secondaryPosition: null, dominantFoot: "Destro", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "gui", fullName: "Guilherme Santos", playerName: "Gui", jerseyNumber: 8, position: "Ala Esquerdo", secondaryPosition: null, dominantFoot: "Canhoto", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "biel", fullName: "Gabriel Costa", playerName: "Biel", jerseyNumber: 9, position: "Atacante/Pivô", secondaryPosition: null, dominantFoot: "Destro", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "rafa", fullName: "Rafael Lima", playerName: "Rafa", jerseyNumber: 10, position: "Meia", secondaryPosition: null, dominantFoot: "Destro", role: "admin", rosterStatus: "approved", avatarUrl: null },
  { id: "jordao", fullName: "Jordão Henrique", playerName: "Jordão", jerseyNumber: 11, position: "Atacante/Pivô", secondaryPosition: null, dominantFoot: "Ambidestro", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "pedro", fullName: "Pedro Albuquerque", playerName: "Pedro", jerseyNumber: 14, position: "Meia", secondaryPosition: null, dominantFoot: "Destro", role: "user", rosterStatus: "approved", avatarUrl: null },
  { id: "caio", fullName: "Caio Mendes", playerName: "Caio", jerseyNumber: 22, position: "Ala Esquerdo", secondaryPosition: null, dominantFoot: "Canhoto", role: "user", rosterStatus: "approved", avatarUrl: null },
];

export async function getRosterPlayers(): Promise<RosterPlayer[]> {
  try {
    const rows = await getD1()
      .prepare(
        `SELECT id, full_name, player_name, jersey_number, position,
                secondary_position, dominant_foot, role, roster_status, avatar_key
         FROM users
         WHERE roster_status = 'approved'
         ORDER BY jersey_number ASC, player_name ASC`,
      )
      .all<StoredRosterRow>();

    const dbPlayers = (rows.results ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      playerName: row.player_name,
      jerseyNumber: row.jersey_number,
      position: normalizePlayerPosition(row.position),
      secondaryPosition: row.secondary_position
        ? normalizePlayerPosition(row.secondary_position)
        : null,
      dominantFoot: row.dominant_foot,
      role: row.role,
      rosterStatus: row.roster_status,
      avatarUrl: row.avatar_key
        ? `/api/avatar?userId=${encodeURIComponent(row.id)}`
        : null,
    }));

    if (dbPlayers.length > 0) {
      return dbPlayers;
    }

    return DEFAULT_ROSTER_PLAYERS;
  } catch (error) {
    console.error("failed-to-load-roster", error);
    return DEFAULT_ROSTER_PLAYERS;
  }
}

export async function requestJoinRoster(userId: string): Promise<boolean> {
  const now = Date.now();
  const updatedAt = new Date().toISOString();

  const result = await getD1()
    .prepare(
      `UPDATE users
       SET roster_status = 'pending',
           roster_requested_at = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(now, updatedAt, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function cancelJoinRoster(userId: string): Promise<boolean> {
  const updatedAt = new Date().toISOString();

  const result = await getD1()
    .prepare(
      `UPDATE users
       SET roster_status = 'not_requested',
           roster_requested_at = NULL,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(updatedAt, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function reviewRosterRequest(
  targetUserId: string,
  decision: "approved" | "rejected",
  reviewerId: string,
): Promise<boolean> {
  const now = Date.now();
  const updatedAt = new Date().toISOString();

  const result = await getD1()
    .prepare(
      `UPDATE users
       SET roster_status = ?,
           roster_reviewed_at = ?,
           roster_reviewed_by = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(decision, now, reviewerId, updatedAt, targetUserId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

