import { getD1 } from "@/db";

type AuthRateLimitAction = "login" | "register";

type AuthRateLimitPolicy = {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

type StoredAuthRateLimit = {
  attempt_count: number;
  window_started_at: number;
  blocked_until: number | null;
};

export type AuthRateLimitCheck = {
  action: AuthRateLimitAction;
  key: string;
  subjectHash: string;
  clientHash: string;
  limited: boolean;
  retryAfterSeconds: number;
  row: StoredAuthRateLimit | null;
  policy: AuthRateLimitPolicy;
};

const AUTH_RATE_LIMIT_POLICIES = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockMs: 15 * 60 * 1000,
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
    blockMs: 60 * 60 * 1000,
  },
} satisfies Record<AuthRateLimitAction, AuthRateLimitPolicy>;

const UNKNOWN_CLIENT = "unknown-client";
const EMPTY_SUBJECT = "all";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(digest));
}

function getClientAddress(request: Request) {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedIp = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwardedIp || UNKNOWN_CLIENT;
}

function getUserAgent(request: Request) {
  return request.headers.get("user-agent")?.slice(0, 160) || "";
}

async function buildAuthRateLimitKey(
  action: AuthRateLimitAction,
  request: Request,
  subject?: string,
) {
  const subjectHash = await sha256Hex(`${action}:subject:${subject || EMPTY_SUBJECT}`);
  const clientHash = await sha256Hex(
    `${action}:client:${getClientAddress(request)}:${getUserAgent(request)}`,
  );
  const key = await sha256Hex(`${action}:key:${subjectHash}:${clientHash}`);

  return { key, subjectHash, clientHash };
}

function getRetryAfterSeconds(blockedUntil: number | null, now: number) {
  if (!blockedUntil || blockedUntil <= now) return 0;
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000));
}

export async function checkAuthRateLimit({
  action,
  request,
  subject,
}: {
  action: AuthRateLimitAction;
  request: Request;
  subject?: string;
}): Promise<AuthRateLimitCheck> {
  const policy = AUTH_RATE_LIMIT_POLICIES[action];
  const { key, subjectHash, clientHash } = await buildAuthRateLimitKey(
    action,
    request,
    subject,
  );
  const now = Date.now();
  const row = await getD1()
    .prepare(
      `SELECT attempt_count, window_started_at, blocked_until
       FROM auth_rate_limits
       WHERE key = ?
       LIMIT 1`,
    )
    .bind(key)
    .first<StoredAuthRateLimit>();
  const retryAfterSeconds = getRetryAfterSeconds(row?.blocked_until ?? null, now);

  return {
    action,
    key,
    subjectHash,
    clientHash,
    limited: retryAfterSeconds > 0,
    retryAfterSeconds,
    row: row ?? null,
    policy,
  };
}

export async function recordAuthRateLimitFailure(check: AuthRateLimitCheck) {
  const now = Date.now();
  const isSameWindow =
    check.row && check.row.window_started_at + check.policy.windowMs > now;
  const attemptCount = isSameWindow ? check.row.attempt_count + 1 : 1;
  const windowStartedAt = isSameWindow ? check.row.window_started_at : now;
  const blockedUntil =
    attemptCount >= check.policy.maxAttempts ? now + check.policy.blockMs : null;
  const updatedAt = new Date().toISOString();

  await getD1()
    .prepare(
      `INSERT INTO auth_rate_limits (
         key, action, subject_hash, client_hash, attempt_count,
         window_started_at, blocked_until, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         action = excluded.action,
         subject_hash = excluded.subject_hash,
         client_hash = excluded.client_hash,
         attempt_count = excluded.attempt_count,
         window_started_at = excluded.window_started_at,
         blocked_until = excluded.blocked_until,
         updated_at = excluded.updated_at`,
    )
    .bind(
      check.key,
      check.action,
      check.subjectHash,
      check.clientHash,
      attemptCount,
      windowStartedAt,
      blockedUntil,
      updatedAt,
    )
    .run();

  return {
    limited: blockedUntil !== null,
    retryAfterSeconds: getRetryAfterSeconds(blockedUntil, now),
  };
}

export async function clearAuthRateLimit(check: AuthRateLimitCheck) {
  await getD1()
    .prepare("DELETE FROM auth_rate_limits WHERE key = ?")
    .bind(check.key)
    .run();
}

export function createAuthRateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "Muitas tentativas. Tente novamente em alguns minutos." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
      },
    },
  );
}
