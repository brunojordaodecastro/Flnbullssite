import {
  clearSessionCookie,
  deleteSession,
  getSessionToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  const token = getSessionToken(request);
  if (token) {
    try {
      await deleteSession(token);
    } catch {
      // The cookie is still cleared even if the backing session already expired.
    }
  }

  return Response.json(
    { message: "Sessão encerrada." },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": clearSessionCookie(request.url),
      },
    },
  );
}
