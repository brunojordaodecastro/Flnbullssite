import { getPlayerFromSession, getSessionToken } from "@/lib/auth";

export async function GET(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json({ error: "Sessão não encontrada." }, { status: 401 });
  }

  try {
    const user = await getPlayerFromSession(token);
    if (!user) {
      return Response.json({ error: "Sessão expirada." }, { status: 401 });
    }

    return Response.json(
      { user },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Não foi possível carregar o perfil." },
      { status: 500 },
    );
  }
}
