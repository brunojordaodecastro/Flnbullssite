import {
  authenticatePlayer,
  createSessionCookie,
  getSafeAuthErrorCode,
  validateLogin,
} from "@/lib/auth";
import {
  checkAuthRateLimit,
  clearAuthRateLimit,
  createAuthRateLimitResponse,
  recordAuthRateLimitFailure,
} from "@/lib/auth-rate-limit";
import { validateAuthRequestSecurity } from "@/lib/auth-security";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Informe nome de jogador e senha." },
      { status: 400 },
    );
  }

  const validation = validateLogin(payload);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const securityError = await validateAuthRequestSecurity(request, payload);
    if (securityError) return securityError;

    const rateLimit = await checkAuthRateLimit({
      action: "login",
      request,
      subject: validation.value.playerNameNormalized,
    });
    if (rateLimit.limited) {
      return createAuthRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const authenticated = await authenticatePlayer(validation.value);
    if (!authenticated) {
      const failedRateLimit = await recordAuthRateLimitFailure(rateLimit);
      if (failedRateLimit.limited) {
        return createAuthRateLimitResponse(failedRateLimit.retryAfterSeconds);
      }

      return Response.json(
        { error: "Nome de jogador ou senha inválidos." },
        { status: 401 },
      );
    }

    await clearAuthRateLimit(rateLimit);

    return Response.json(
      { message: "Login realizado com sucesso.", user: authenticated.user },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": createSessionCookie(
            authenticated.session.token,
            authenticated.session.expiresAt,
            request.url,
          ),
        },
      },
    );
  } catch (error) {
    console.error("auth-login-failed", { code: getSafeAuthErrorCode(error) });
    return Response.json(
      { error: "Não foi possível entrar agora." },
      { status: 500 },
    );
  }
}
