import { getD1 } from "@/db";
import {
  DOMINANT_FEET,
  PLAYER_POSITIONS,
  type DominantFoot,
  type PlayerPosition,
} from "@/lib/player";

export type PlayerProfile = {
  id: string;
  fullName: string;
  playerName: string;
  jerseyNumber: number;
  position: string;
  secondaryPosition: string | null;
  dominantFoot: string | null;
  role?: string;
  rosterStatus?: string;
  createdAt: string;
  avatarUrl: string | null;
};

type RegistrationInput = {
  fullName: string;
  playerName: string;
  playerNameNormalized: string;
  password: string;
  jerseyNumber: number;
  position: PlayerPosition;
};

type LoginInput = {
  playerNameNormalized: string;
  password: string;
};

type StoredUser = {
  id: string;
  full_name: string;
  player_name: string;
  player_name_normalized: string;
  password_hash: string;
  password_salt: string;
  jersey_number: number;
  position: string;
  secondary_position: string | null;
  dominant_foot: string | null;
  role: string;
  roster_status: string;
  avatar_key: string | null;
  created_at: string;
};

type StoredProfile = Pick<
  StoredUser,
  | "id"
  | "full_name"
  | "player_name"
  | "jersey_number"
  | "position"
  | "secondary_position"
  | "dominant_foot"
  | "role"
  | "roster_status"
  | "avatar_key"
  | "created_at"
>;

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const SESSION_COOKIE_NAME = "fln_bulls_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_HASH_SCHEME = "pbkdf2-sha256";
// O workerd de produção recusa PBKDF2 acima de 100.000 iterações
// ("Pbkdf2 failed: iteration counts above 100000 are not supported"), como
// defesa contra DoS no ambiente multi-tenant. O runtime local NÃO aplica esse
// teto, então valores maiores passam em dev e quebram só no deploy.
// Não aumente isto sem confirmar que a plataforma passou a aceitar:
// https://github.com/cloudflare/workerd/issues/1346
const MAX_WORKERS_PBKDF2_ITERATIONS = 100_000;
const CURRENT_PBKDF2_ITERATIONS = MAX_WORKERS_PBKDF2_ITERATIONS;
// Formato antigo (digest puro, sem prefixo de esquema) usava a mesma contagem.
const LEGACY_PBKDF2_ITERATIONS = 100_000;
const PASSWORD_DIGEST_PATTERN = /^[0-9a-f]{64}$/i;
const DUMMY_SALT = "000102030405060708090a0b0c0d0e0f";
const DUMMY_DIGEST = "0".repeat(64);
const DUMMY_HASH = `${PASSWORD_HASH_SCHEME}$${CURRENT_PBKDF2_ITERATIONS}$${DUMMY_DIGEST}`;

function cleanText(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizePlayerName(value: string) {
  return cleanText(value).toLocaleLowerCase("pt-BR");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    throw new Error("Invalid hexadecimal value");
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

async function derivePasswordHash(
  password: string,
  saltHex: string,
  iterations: number,
) {
  const passwordBytes = new TextEncoder().encode(password);
  const saltBytes = hexToBytes(saltHex);
  let keyMaterial: CryptoKey;
  try {
    keyMaterial = await crypto.subtle.importKey(
      "raw",
      passwordBytes.buffer,
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
  } catch (error) {
    throw new Error("auth-stage-kdf-import", { cause: error });
  }

  let bits: ArrayBuffer;
  try {
    bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: { name: "SHA-256" },
        salt: saltBytes.buffer,
        iterations,
      },
      keyMaterial,
      256,
    );
  } catch (error) {
    throw new Error("auth-stage-kdf-derive", { cause: error });
  }
  return bytesToHex(new Uint8Array(bits));
}

function encodePasswordHash(digest: string) {
  return `${PASSWORD_HASH_SCHEME}$${CURRENT_PBKDF2_ITERATIONS}$${digest}`;
}

function parsePasswordHash(value: string) {
  if (PASSWORD_DIGEST_PATTERN.test(value)) {
    return {
      digest: value.toLowerCase(),
      iterations: LEGACY_PBKDF2_ITERATIONS,
      needsUpgrade: true,
    };
  }

  const [scheme, iterationsText, digest, ...extra] = value.split("$");
  const iterations = Number(iterationsText);
  if (
    extra.length > 0 ||
    scheme !== PASSWORD_HASH_SCHEME ||
    iterations !== CURRENT_PBKDF2_ITERATIONS ||
    !PASSWORD_DIGEST_PATTERN.test(digest ?? "")
  ) {
    return null;
  }

  return {
    digest: digest.toLowerCase(),
    iterations,
    needsUpgrade: false,
  };
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return bytesToHex(new Uint8Array(digest));
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateRegistration(
  payload: unknown,
): ValidationResult<RegistrationInput> {
  if (!isObject(payload)) {
    return { ok: false, error: "Preencha todos os campos do cadastro." };
  }

  const fullName =
    typeof payload.fullName === "string" ? cleanText(payload.fullName) : "";
  const playerName =
    typeof payload.playerName === "string"
      ? cleanText(payload.playerName)
      : "";
  const password =
    typeof payload.password === "string" ? payload.password : "";
  const confirmPassword =
    typeof payload.confirmPassword === "string"
      ? payload.confirmPassword
      : "";
  const jerseyNumber = Number(payload.jerseyNumber);
  const position =
    typeof payload.position === "string" ? payload.position : "";

  if (fullName.length < 3 || fullName.length > 100) {
    return {
      ok: false,
      error: "Informe o nome completo com 3 a 100 caracteres.",
    };
  }
  if (playerName.length < 3 || playerName.length > 30) {
    return {
      ok: false,
      error: "O nome de jogador deve ter entre 3 e 30 caracteres.",
    };
  }
  if (password.length < 8 || password.length > 128) {
    return {
      ok: false,
      error: "A senha deve ter entre 8 e 128 caracteres.",
    };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "A confirmação de senha não corresponde." };
  }
  if (!Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
    return {
      ok: false,
      error: "O número da camisa deve ser um número inteiro entre 1 e 99.",
    };
  }
  if (!PLAYER_POSITIONS.includes(position as PlayerPosition)) {
    return { ok: false, error: "Escolha uma posição válida." };
  }

  return {
    ok: true,
    value: {
      fullName,
      playerName,
      playerNameNormalized: normalizePlayerName(playerName),
      password,
      jerseyNumber,
      position: position as PlayerPosition,
    },
  };
}

export function validateLogin(payload: unknown): ValidationResult<LoginInput> {
  if (!isObject(payload)) {
    return { ok: false, error: "Informe nome de jogador e senha." };
  }

  const playerName =
    typeof payload.playerName === "string"
      ? cleanText(payload.playerName)
      : "";
  const password =
    typeof payload.password === "string" ? payload.password : "";

  if (!playerName || !password) {
    return { ok: false, error: "Informe nome de jogador e senha." };
  }

  return {
    ok: true,
    value: {
      playerNameNormalized: normalizePlayerName(playerName),
      password,
    },
  };
}

async function makeSession(userId: string) {
  const token = randomHex(32);
  const tokenHash = await hashSessionToken(token);
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const createdAt = new Date().toISOString();

  return { token, tokenHash, userId, expiresAt, createdAt };
}

async function createSession(userId: string) {
  const session = await makeSession(userId);
  await getD1()
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(
      session.tokenHash,
      session.userId,
      session.expiresAt,
      session.createdAt,
    )
    .run();

  return { token: session.token, expiresAt: session.expiresAt };
}

export async function cleanupExpiredSessions() {
  try {
    await getD1()
      .prepare("DELETE FROM sessions WHERE expires_at < ?")
      .bind(Date.now())
      .run();
  } catch (error) {
    const message =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : error instanceof Error
          ? error.message
          : "";
    const code = message.includes("no such table")
      ? "sessions-table-unavailable"
      : message.includes("D1_ERROR")
        ? "d1-cleanup-error"
        : "session-cleanup-error";

    console.warn("Expired session cleanup skipped", { code });
  }
}

export async function createPlayerAccount(input: RegistrationInput) {
  const salt = randomHex(16);
  const passwordDigest = await derivePasswordHash(
    input.password,
    salt,
    CURRENT_PBKDF2_ITERATIONS,
  );
  const passwordHash = encodePasswordHash(passwordDigest);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const session = await makeSession(id);
  const d1 = getD1();

  await d1.batch([
    d1
      .prepare(
        `INSERT INTO users (
          id, full_name, player_name, player_name_normalized,
          password_hash, password_salt, jersey_number, position, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.fullName,
        input.playerName,
        input.playerNameNormalized,
        passwordHash,
        salt,
        input.jerseyNumber,
        input.position,
        createdAt,
      ),
    d1
      .prepare(
        `INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(
        session.tokenHash,
        session.userId,
        session.expiresAt,
        session.createdAt,
      ),
  ]);

  await cleanupExpiredSessions();
  const user: PlayerProfile = {
    id,
    fullName: input.fullName,
    playerName: input.playerName,
    jerseyNumber: input.jerseyNumber,
    position: input.position,
    secondaryPosition: null,
    dominantFoot: null,
    createdAt,
    avatarUrl: null,
  };
  return {
    user,
    session: { token: session.token, expiresAt: session.expiresAt },
  };
}

export async function authenticatePlayer(input: LoginInput) {
  let user: StoredUser | null;
  try {
    user = await getD1()
      .prepare(
        `SELECT id, full_name, player_name, player_name_normalized,
                password_hash, password_salt, jersey_number, position,
                secondary_position, dominant_foot, role, roster_status,
                avatar_key, created_at
         FROM users
         WHERE player_name_normalized = ?
         LIMIT 1`,
      )
      .bind(input.playerNameNormalized)
      .first<StoredUser>();
  } catch (error) {
    throw new Error("auth-stage-d1-user-select", { cause: error });
  }

  const storedPasswordHash = parsePasswordHash(
    user?.password_hash ?? DUMMY_HASH,
  );
  const computedDigest = await derivePasswordHash(
    input.password,
    user?.password_salt ?? DUMMY_SALT,
    storedPasswordHash?.iterations ?? CURRENT_PBKDF2_ITERATIONS,
  );
  const valid = constantTimeEqual(
    computedDigest,
    storedPasswordHash?.digest ?? DUMMY_DIGEST,
  );

  if (!user || !storedPasswordHash || !valid) {
    return null;
  }

  if (storedPasswordHash.needsUpgrade) {
    try {
      const upgradedDigest = await derivePasswordHash(
        input.password,
        user.password_salt,
        CURRENT_PBKDF2_ITERATIONS,
      );
      await getD1()
        .prepare(
          "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        )
        .bind(
          encodePasswordHash(upgradedDigest),
          new Date().toISOString(),
          user.id,
        )
        .run();
    } catch (error) {
      console.warn("Password hash upgrade skipped", {
        code: getSafeAuthErrorCode(error),
      });
    }
  }

  const session = await createSession(user.id);
  await cleanupExpiredSessions();
  const profile: PlayerProfile = {
    id: user.id,
    fullName: user.full_name,
    playerName: user.player_name,
    jerseyNumber: user.jersey_number,
    position: user.position,
    secondaryPosition: user.secondary_position,
    dominantFoot: user.dominant_foot,
    role: user.role,
    rosterStatus: user.roster_status,
    createdAt: user.created_at,
    avatarUrl: user.avatar_key
      ? `/api/avatar?userId=${encodeURIComponent(user.id)}`
      : null,
  };
  return { user: profile, session };
}

export function getSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

export async function getPlayerFromSession(token: string) {
  const tokenHash = await hashSessionToken(token);
  const row = await getD1()
    .prepare(
      `SELECT users.id, users.full_name, users.player_name,
              users.jersey_number, users.position, users.secondary_position,
              users.dominant_foot, users.role, users.roster_status,
              users.avatar_key, users.created_at
       FROM sessions
       INNER JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?
       LIMIT 1`,
    )
    .bind(tokenHash, Date.now())
    .first<StoredProfile>();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    playerName: row.player_name,
    jerseyNumber: row.jersey_number,
    position: row.position,
    secondaryPosition: row.secondary_position,
    dominantFoot: row.dominant_foot,
    role: row.role,
    rosterStatus: row.roster_status,
    createdAt: row.created_at,
    avatarUrl: row.avatar_key
      ? `/api/avatar?userId=${encodeURIComponent(row.id)}`
      : null,
  };
}

export type UpdateProfileInput = {
  fullName?: string;
  jerseyNumber?: number;
  position?: PlayerPosition;
  secondaryPosition?: PlayerPosition | null;
  dominantFoot?: DominantFoot | null;
};

export function validateProfileUpdate(
  input: unknown,
): ValidationResult<UpdateProfileInput> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados inválidos." };
  }

  const payload = input as Record<string, unknown>;
  const result: UpdateProfileInput = {};

  if ("fullName" in payload && typeof payload.fullName === "string") {
    const cleaned = cleanText(payload.fullName);
    if (cleaned.length < 3 || cleaned.length > 100) {
      return {
        ok: false,
        error: "O nome completo deve ter entre 3 e 100 caracteres.",
      };
    }
    result.fullName = cleaned;
  }

  if ("jerseyNumber" in payload) {
    const num = Number(payload.jerseyNumber);
    if (!Number.isInteger(num) || num < 1 || num > 99) {
      return {
        ok: false,
        error: "O número da camisa deve estar entre 1 e 99.",
      };
    }
    result.jerseyNumber = num;
  }

  if ("position" in payload && typeof payload.position === "string") {
    if (!PLAYER_POSITIONS.includes(payload.position as PlayerPosition)) {
      return { ok: false, error: "Posição principal inválida." };
    }
    result.position = payload.position as PlayerPosition;
  }

  if ("secondaryPosition" in payload) {
    if (
      payload.secondaryPosition === null ||
      payload.secondaryPosition === "" ||
      payload.secondaryPosition === "Nenhuma"
    ) {
      result.secondaryPosition = null;
    } else if (
      typeof payload.secondaryPosition === "string" &&
      PLAYER_POSITIONS.includes(payload.secondaryPosition as PlayerPosition)
    ) {
      result.secondaryPosition = payload.secondaryPosition as PlayerPosition;
    } else {
      return { ok: false, error: "Posição secundária inválida." };
    }
  }

  if ("dominantFoot" in payload) {
    if (
      payload.dominantFoot === null ||
      payload.dominantFoot === "" ||
      payload.dominantFoot === "Não informada"
    ) {
      result.dominantFoot = null;
    } else if (
      typeof payload.dominantFoot === "string" &&
      DOMINANT_FEET.includes(payload.dominantFoot as DominantFoot)
    ) {
      result.dominantFoot = payload.dominantFoot as DominantFoot;
    } else {
      return {
        ok: false,
        error:
          "Perna dominante inválida. Escolha Destro, Canhoto ou Ambidestro.",
      };
    }
  }

  return { ok: true, value: result };
}

export async function updatePlayerProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  const updatedAt = new Date().toISOString();
  await getD1()
    .prepare(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           jersey_number = COALESCE(?, jersey_number),
           position = COALESCE(?, position),
           secondary_position = ?,
           dominant_foot = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      input.fullName ?? null,
      input.jerseyNumber ?? null,
      input.position ?? null,
      input.secondaryPosition !== undefined ? input.secondaryPosition : null,
      input.dominantFoot !== undefined ? input.dominantFoot : null,
      updatedAt,
      userId,
    )
    .run();
}

export async function deleteSession(token: string) {
  const tokenHash = await hashSessionToken(token);
  await getD1()
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .run();
}

export type AdminUserView = {
  id: string;
  fullName: string;
  playerName: string;
  jerseyNumber: number;
  position: string;
  secondaryPosition: string | null;
  dominantFoot: string | null;
  role: string;
  rosterStatus: string;
  rosterRequestedAt?: number | null;
  avatarUrl: string | null;
  createdAt: string;
};

export async function listAllUsersForAdmin(): Promise<AdminUserView[]> {
  const rows = await getD1()
    .prepare(
      `SELECT id, full_name, player_name, jersey_number, position,
              secondary_position, dominant_foot, role, roster_status,
              roster_requested_at, avatar_key, created_at
       FROM users
       ORDER BY
         CASE WHEN roster_status = 'pending' THEN 0 ELSE 1 END ASC,
         role DESC,
         jersey_number ASC,
         player_name ASC`,
    )
    .all<StoredUser & { roster_requested_at: number | null }>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    playerName: row.player_name,
    jerseyNumber: row.jersey_number,
    position: row.position,
    secondaryPosition: row.secondary_position,
    dominantFoot: row.dominant_foot,
    role: row.role,
    rosterStatus: row.roster_status,
    rosterRequestedAt: row.roster_requested_at,
    avatarUrl: row.avatar_key
      ? `/api/avatar?userId=${encodeURIComponent(row.id)}`
      : null,
    createdAt: row.created_at,
  }));
}

export async function setUserRole(userId: string, role: "admin" | "user") {
  const updatedAt = new Date().toISOString();
  await getD1()
    .prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
    .bind(role, updatedAt, userId)
    .run();
}

export async function setUserRosterStatus(
  userId: string,
  status: "approved" | "rejected" | "pending" | "not_requested",
  reviewerId: string,
) {
  const now = Date.now();
  const updatedAt = new Date().toISOString();
  await getD1()
    .prepare(
      `UPDATE users
       SET roster_status = ?,
           roster_reviewed_at = ?,
           roster_reviewed_by = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(status, now, reviewerId, updatedAt, userId)
    .run();
}

export function createSessionCookie(
  token: string,
  expiresAt: number,
  requestUrl: string,
) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Expires=${new Date(expiresAt).toUTCString()}${secure}`;
}

export function clearSessionCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

export function isDuplicatePlayerNameError(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
      : String(error);
  return (
    message.includes("idx_users_player_name_normalized") ||
    message.includes("users.player_name_normalized")
  );
}

export function getSafeAuthErrorCode(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
      : String(error);

  if (message.includes("binding `DB` is unavailable")) {
    return "d1-binding-unavailable";
  }
  const stage = message.match(/auth-stage-[a-z-]+/)?.[0];
  if (stage) {
    return stage;
  }
  if (message.includes("D1_ERROR")) {
    return "d1-query-error";
  }
  if (message.toLowerCase().includes("constraint")) {
    return "database-constraint";
  }
  return error instanceof Error ? error.name : "unknown-auth-error";
}
