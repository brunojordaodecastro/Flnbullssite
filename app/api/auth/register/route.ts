import {
  createPlayerAccount,
  createSessionCookie,
  getSafeAuthErrorCode,
  isDuplicatePlayerNameError,
  validateRegistration,
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
      { error: "Dados de cadastro inválidos." },
      { status: 400 },
    );
  }

  const validation = validateRegistration(payload);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  let rateLimit;
  try {
    const securityError = await validateAuthRequestSecurity(request, payload);
    if (securityError) return securityError;

    rateLimit = await checkAuthRateLimit({
      action: "register",
      request,
    });
    if (rateLimit.limited) {
      return createAuthRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const { user, session } = await createPlayerAccount(validation.value);
    await clearAuthRateLimit(rateLimit);

    return Response.json(
      { message: "Usuário criado com sucesso.", user },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": createSessionCookie(
            session.token,
            session.expiresAt,
            request.url,
          ),
        },
      },
    );
  } catch (error) {
    console.error("auth-register-failed", {
      code: getSafeAuthErrorCode(error),
      // A causa traz a mensagem real da WebCrypto/D1; sem ela o log só diz em
      // qual etapa quebrou, o que não basta para diagnosticar em produção.
      cause:
        error instanceof Error && error.cause instanceof Error
          ? error.cause.message
          : undefined,
    });

    if (rateLimit) {
      const failedRateLimit = await recordAuthRateLimitFailure(rateLimit);
      if (failedRateLimit.limited) {
        return createAuthRateLimitResponse(failedRateLimit.retryAfterSeconds);
      }
    }

    if (isDuplicatePlayerNameError(error)) {
      return Response.json(
        { error: "Este nome de jogador já está em uso." },
        { status: 409 },
      );
    }

    return Response.json(
      { error: "Não foi possível criar o usuário agora." },
      { status: 500 },
    );
  }
}
