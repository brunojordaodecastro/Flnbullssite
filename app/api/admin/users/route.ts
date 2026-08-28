import {
  getPlayerFromSession,
  getSessionToken,
  listAllUsersForAdmin,
  setUserRole,
  setUserRosterStatus,
} from "@/lib/auth";

export async function GET(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const currentUser = await getPlayerFromSession(token);
  if (!currentUser || currentUser.role !== "admin") {
    return Response.json(
      { error: "Acesso restrito para administradores." },
      { status: 403 },
    );
  }

  try {
    const users = await listAllUsersForAdmin();
    return Response.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("admin-list-users-error", error);
    return Response.json({ error: "Erro ao buscar usuários." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const token = getSessionToken(request);
  if (!token) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const currentUser = await getPlayerFromSession(token);
  if (!currentUser || currentUser.role !== "admin") {
    return Response.json(
      { error: "Acesso restrito para administradores." },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const data = payload as {
    targetUserId: string;
    role?: "admin" | "user";
    rosterStatus?: "approved" | "rejected" | "pending" | "not_requested";
  };

  if (!data.targetUserId) {
    return Response.json({ error: "ID de usuário obrigatório." }, { status: 400 });
  }

  try {
    if (data.role && ["admin", "user"].includes(data.role)) {
      await setUserRole(data.targetUserId, data.role);
    }

    if (
      data.rosterStatus &&
      ["approved", "rejected", "pending", "not_requested"].includes(data.rosterStatus)
    ) {
      await setUserRosterStatus(
        data.targetUserId,
        data.rosterStatus,
        currentUser.id,
      );
    }

    const updatedUsers = await listAllUsersForAdmin();
    return Response.json({
      message: "Usuário atualizado com sucesso.",
      users: updatedUsers,
    });
  } catch (error) {
    console.error("admin-update-user-error", error);
    return Response.json({ error: "Erro ao atualizar usuário." }, { status: 500 });
  }
}

