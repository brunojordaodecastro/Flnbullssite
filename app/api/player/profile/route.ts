import {
  getPlayerFromSession,
  getSessionToken,
  updatePlayerProfile,
  validateProfileUpdate,
} from "@/lib/auth";

export async function PATCH(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json({ error: "Sessão não encontrada." }, { status: 401 });
  }

  const user = await getPlayerFromSession(token);
  if (!user) {
    return Response.json({ error: "Sessão expirada." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const validation = validateProfileUpdate(payload);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    await updatePlayerProfile(user.id, validation.value);
    const updatedUser = await getPlayerFromSession(token);

    return Response.json(
      { message: "Perfil atualizado com sucesso.", user: updatedUser },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("profile-update-failed", error);
    return Response.json(
      { error: "Não foi possível atualizar o perfil agora." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}

