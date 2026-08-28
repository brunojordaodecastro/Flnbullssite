import { env } from "cloudflare:workers";

const CSRF_COOKIE_NAME = "fln_bulls_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_BYTES = 32;
const CSRF_MAX_AGE_SECONDS = 2 * 60 * 60;
const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type AuthSecurityPayload = {
  turnstileToken?: unknown;
};

type TurnstileSiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function getEnvString(name: string) {
  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [cookieName, ...valueParts] = part.trim().split("=");
    if (cookieName === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return "";
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isLocalRequest(request: Request) {
  return isLocalHostname(new URL(request.url).hostname);
}

function getClientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

function createSecurityError(error: string, status = 403) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function hasValidRequestOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (origin) return origin === requestOrigin;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  return fetchSite === "same-origin" || fetchSite === "same-site";
}

function validateCsrfToken(request: Request) {
  const csrfToken = request.headers.get(CSRF_HEADER_NAME) ?? "";
  const csrfCookie = getCookie(request, CSRF_COOKIE_NAME);
  return (
    csrfToken.length === CSRF_TOKEN_BYTES * 2 &&
    csrfCookie.length === CSRF_TOKEN_BYTES * 2 &&
    constantTimeEqual(csrfToken, csrfCookie)
  );
}

function isExpectedTurnstileHostname(request: Request, hostname: string) {
  const requestHostname = new URL(request.url).hostname;
  if (hostname === requestHostname) return true;
  return isLocalRequest(request) && isLocalHostname(hostname);
}

export function getTurnstileSiteKey() {
  return getEnvString("TURNSTILE_SITE_KEY");
}

export function createCsrfToken() {
  return randomHex(CSRF_TOKEN_BYTES);
}

export function createCsrfCookie(token: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${CSRF_MAX_AGE_SECONDS}${secure}`;
}

export async function verifyTurnstileToken(
  request: Request,
  token: unknown,
) {
  const secret =
    getEnvString("TURNSTILE_SECRET_KEY") || getEnvString("TURNSTILE_SECRET");

  if (!secret) {
    if (isLocalRequest(request)) return true;

    console.error("turnstile-secret-missing");
    return false;
  }

  if (typeof token !== "string" || !token.trim()) {
    return false;
  }

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);

  const remoteIp = getClientAddress(request);
  if (remoteIp) {
    form.set("remoteip", remoteIp);
  }

  const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    console.error("turnstile-siteverify-http-error", {
      status: response.status,
    });
    return false;
  }

  const result = (await response.json().catch(() => null)) as
    | TurnstileSiteverifyResponse
    | null;
  if (!result?.success) {
    console.warn("turnstile-siteverify-rejected", {
      codes: result?.["error-codes"] ?? [],
    });
    return false;
  }

  if (
    result.hostname &&
    !isExpectedTurnstileHostname(request, result.hostname)
  ) {
    console.warn("turnstile-hostname-mismatch", {
      hostname: result.hostname,
    });
    return false;
  }

  return true;
}

export async function validateAuthRequestSecurity(
  request: Request,
  payload: AuthSecurityPayload,
) {
  if (!hasValidRequestOrigin(request)) {
    return createSecurityError("Requisição de origem inválida.");
  }

  if (!validateCsrfToken(request)) {
    return createSecurityError(
      "Sessão do formulário expirada. Recarregue a página.",
    );
  }

  const turnstileValid = await verifyTurnstileToken(
    request,
    payload.turnstileToken,
  );
  if (!turnstileValid) {
    return createSecurityError("Validação anti-robô não aprovada.", 400);
  }

  return null;
}
